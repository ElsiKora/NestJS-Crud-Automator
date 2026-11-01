import type { TTypeOrmColumnMetadata } from "@type/utility/typeorm";
import type { DataSource, EntityMetadata, FindManyOptions, FindOneOptions, ObjectLiteral, RelationMetadata, Repository, SelectQueryBuilder } from "typeorm";

import { ErrorException } from "@utility/error/exception.utility";

const KEY_PAGE_TEMPORAL_COLUMN_TYPES: ReadonlySet<string> = new Set<string>(["date", "timestamp without time zone", "timestamp with time zone"]);
const KEY_PAGE_ALIAS: string = "crud_automator_key_page";
const KEY_PAGE_PARAMETER_PREFIX: string = "crud_automator_page_key";

/**
 * Loads PostgreSQL pages of entities that have a temporal primary key and joined relations.
 * TypeORM pages such reads in two steps and binds the parsed `Date` keys of the first step into the second one.
 * pg serializes a `Date` through a local offset truncated to whole minutes, so keys in historic zone offsets match no row.
 * The loader reads the page keys as PostgreSQL text and binds that text back, which keeps every instant exact.
 * Other drivers, entities without a temporal primary key and reads without joins or paging keep the repository methods.
 */
export class ApiFunctionKeyPageLoader {
	/**
	 * Rejects relations that TypeORM would load by a separate query over temporal join values.
	 * The relation query binds the parsed `Date` values of the loaded entities, which pg serializes through a truncated local offset.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository of the read
	 * @param {unknown} relations - Requested relations as TypeORM find options take them
	 * @param {unknown} relationLoadStrategy - Requested relation load strategy
	 * @param {string} [source] - Configuration that requests the relations, named in the error
	 * @throws {Error} When a "query" relation joins through a PostgreSQL date or timestamp column
	 */
	public static assertRelationLoad<E extends ObjectLiteral>(repository: Repository<E>, relations: unknown, relationLoadStrategy: unknown, source?: string): void {
		if (!this.isPostgres(repository)) {
			return;
		}

		// TypeORM inherits the data-source strategy for every falsy per-query value.
		// eslint-disable-next-line @elsikora/typescript/prefer-nullish-coalescing
		if ((relationLoadStrategy || repository.manager.dataSource.options.relationLoadStrategy) !== "query") {
			return;
		}

		this.assertRelationTree(repository, repository.metadata, this.createRelationTree(relations), "", source);
	}

	/**
	 * Finds entities and counts all matches like `Repository.findAndCount` with exact temporal page keys.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository to read from
	 * @param {FindManyOptions<E>} options - Find options of the read
	 * @returns {Promise<[Array<E>, number]>} Entities of the page and the count of all matching entities
	 */
	public static async findAndCount<E extends ObjectLiteral>(repository: Repository<E>, options: FindManyOptions<E>): Promise<[Array<E>, number]> {
		this.assertRelationLoad(repository, options.relations, options.relationLoadStrategy);

		if (!this.isRequired(repository, options)) {
			return repository.findAndCount(options);
		}

		const items: Array<E> = await this.loadPage(repository, options);
		const totalCount: number = await this.createBuilder(repository, options).getCount();

		return [items, totalCount];
	}

	/**
	 * Finds entities like `Repository.find` with exact temporal page keys.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository to read from
	 * @param {FindManyOptions<E>} options - Find options of the read
	 * @returns {Promise<Array<E>>} Entities of the page
	 */
	public static async findMany<E extends ObjectLiteral>(repository: Repository<E>, options: FindManyOptions<E>): Promise<Array<E>> {
		this.assertRelationLoad(repository, options.relations, options.relationLoadStrategy);

		if (!this.isRequired(repository, options)) {
			// eslint-disable-next-line @elsikora/unicorn/no-array-callback-reference -- Repository.find takes find options, not an array callback; a copy would drop non-enumerable protected options.
			return repository.find(options);
		}

		return this.loadPage(repository, options);
	}

	/**
	 * Finds the first entity like `Repository.findOne` with exact temporal page keys.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository to read from
	 * @param {FindOneOptions<E>} options - Find options of the read
	 * @returns {Promise<E | null>} The first matching entity, or null
	 */
	public static async findOne<E extends ObjectLiteral>(repository: Repository<E>, options: FindOneOptions<E>): Promise<E | null> {
		this.assertRelationLoad(repository, options.relations, options.relationLoadStrategy);

		const pageOptions: FindManyOptions<E> = { ...options, take: 1 };

		if (!this.isRequired(repository, pageOptions)) {
			return repository.findOne(options);
		}

		const items: Array<E> = await this.loadPage(repository, pageOptions);

		return items[0] ?? null;
	}

	/**
	 * Walks requested relations and rejects the first one that joins through a temporal column.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository of the read
	 * @param {EntityMetadata} metadata - Metadata of the entity that owns this level of relations
	 * @param {Record<string, unknown>} relationTree - Requested relations of this level
	 * @param {string} parentPath - Relation path of this level
	 * @param {string} [source] - Configuration that requests the relations, named in the error
	 * @param {string} [embedPrefix] - Property path of the embedded part of this level
	 * @throws {Error} When a relation joins through a PostgreSQL date or timestamp column
	 */
	private static assertRelationTree<E extends ObjectLiteral>(repository: Repository<E>, metadata: EntityMetadata, relationTree: Record<string, unknown>, parentPath: string, source?: string, embedPrefix?: string): void {
		for (const [key, value] of Object.entries(relationTree)) {
			if (!value) {
				continue;
			}

			const propertyPath: string = embedPrefix ? `${embedPrefix}.${key}` : key;
			const relation: RelationMetadata | undefined = metadata.findRelationWithPropertyPath(propertyPath);

			if (!relation) {
				if (metadata.findEmbeddedWithPropertyPath(propertyPath) && typeof value === "object") {
					this.assertRelationTree(repository, metadata, value as Record<string, unknown>, parentPath, source, propertyPath);
				}

				continue;
			}

			const relationPath: string = parentPath ? `${parentPath}.${propertyPath}` : propertyPath;
			const joinColumns: Array<TTypeOrmColumnMetadata> = [...relation.joinColumns, ...relation.inverseJoinColumns, ...(relation.inverseRelation?.joinColumns ?? []), ...(relation.inverseRelation?.inverseJoinColumns ?? [])];
			const temporalColumn: TTypeOrmColumnMetadata | undefined = joinColumns.find((column: TTypeOrmColumnMetadata): boolean => this.isTemporalColumn(repository, column) || (column.referencedColumn !== undefined && this.isTemporalColumn(repository, column.referencedColumn)));

			if (temporalColumn) {
				const sourcePrefix: string = source ? source + ": " : "";

				throw ErrorException(`${sourcePrefix}relation "${relationPath}" of entity "${repository.metadata.name}" cannot load with relationLoadStrategy "query" because its join column "${temporalColumn.databaseName}" is a PostgreSQL date or timestamp, which pg binds through a local offset truncated to whole minutes; use relationLoadStrategy: "join"`);
			}

			if (typeof value === "object") {
				this.assertRelationTree(repository, relation.inverseEntityMetadata, value as Record<string, unknown>, relationPath, source);
			}
		}
	}

	/**
	 * Creates a query builder the way `EntityManager.find` does.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository to read from
	 * @param {FindManyOptions<E>} options - Find options of the read
	 * @returns {SelectQueryBuilder<E>} Query builder with the find options applied
	 */
	private static createBuilder<E extends ObjectLiteral>(repository: Repository<E>, options: FindManyOptions<E>): SelectQueryBuilder<E> {
		return repository.manager.createQueryBuilder<E>(repository.metadata.target, repository.metadata.name).setFindOptions(options);
	}

	/**
	 * Converts requested relations into the object form of TypeORM find options.
	 * @param {unknown} relations - Requested relations as property paths or an object
	 * @returns {Record<string, unknown>} Requested relations as an object
	 */
	private static createRelationTree(relations: unknown): Record<string, unknown> {
		if (!Array.isArray(relations)) {
			return typeof relations === "object" && relations !== null ? (relations as Record<string, unknown>) : {};
		}

		const relationTree: Record<string, unknown> = {};

		for (const relationPath of relations) {
			let level: Record<string, unknown> = relationTree;

			for (const segment of String(relationPath).split(".")) {
				const child: unknown = level[segment];
				const nextLevel: Record<string, unknown> = typeof child === "object" && child !== null ? (child as Record<string, unknown>) : {};

				level[segment] = nextLevel;
				level = nextLevel;
			}
		}

		return relationTree;
	}

	/**
	 * Tells whether the repository reads through the PostgreSQL driver.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository of the read
	 * @returns {boolean} Whether the driver is PostgreSQL
	 */
	private static isPostgres<E extends ObjectLiteral>(repository: Repository<E>): boolean {
		const dataSource: Partial<DataSource> | undefined = (repository as Partial<Pick<Repository<E>, "manager">>).manager?.dataSource;

		return dataSource?.driver?.options.type === "postgres";
	}

	/**
	 * Tells whether TypeORM would page the read in two steps over parsed temporal keys.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository to read from
	 * @param {FindManyOptions<E>} options - Find options of the read
	 * @returns {boolean} Whether the loader must page the read
	 */
	private static isRequired<E extends ObjectLiteral>(repository: Repository<E>, options: FindManyOptions<E>): boolean {
		if (!this.isPostgres(repository) || (!options.skip && !options.take)) {
			return false;
		}

		const hasTemporalPrimaryColumn: boolean = repository.metadata.primaryColumns.some((column: TTypeOrmColumnMetadata): boolean => this.isTemporalColumn(repository, column));

		// TypeORM 1 internal: SelectQueryBuilder pages in two steps exactly when `expressionMap.joinAttributes` is not empty; no public API exposes the joins applied by find options.
		return hasTemporalPrimaryColumn && this.createBuilder(repository, options).expressionMap.joinAttributes.length > 0;
	}

	/**
	 * Tells whether pg hydrates the column into a `Date`.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository of the read
	 * @param {TTypeOrmColumnMetadata} column - Column to check
	 * @returns {boolean} Whether the column is a PostgreSQL date or timestamp
	 */
	private static isTemporalColumn<E extends ObjectLiteral>(repository: Repository<E>, column: TTypeOrmColumnMetadata): boolean {
		return KEY_PAGE_TEMPORAL_COLUMN_TYPES.has(repository.manager.dataSource.driver.normalizeType(column));
	}

	/**
	 * Loads one page: the keys first as PostgreSQL text, then the entities of exactly those keys.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository to read from
	 * @param {FindManyOptions<E>} options - Find options of the read
	 * @returns {Promise<Array<E>>} Entities of the page in page order
	 */
	private static async loadPage<E extends ObjectLiteral>(repository: Repository<E>, options: FindManyOptions<E>): Promise<Array<E>> {
		const metadata: EntityMetadata = repository.metadata;
		const alias: string = metadata.name;
		const primaryColumns: Array<TTypeOrmColumnMetadata> = metadata.primaryColumns;
		const orders: Array<{ column: TTypeOrmColumnMetadata; direction: "ASC" | "DESC"; nulls?: "NULLS FIRST" | "NULLS LAST" }> = this.resolveOrders(metadata, options.order);
		// Primary columns break ties in both steps; a column the find order already sorts keeps that direction.
		const tieBreakerColumns: Array<TTypeOrmColumnMetadata> = primaryColumns.filter((column: TTypeOrmColumnMetadata): boolean => !orders.some((order: { column: TTypeOrmColumnMetadata }): boolean => order.column === column));
		const pageBuilder: SelectQueryBuilder<ObjectLiteral> = repository.manager.createQueryBuilder() as SelectQueryBuilder<ObjectLiteral>;
		const pageColumn: (name: string) => string = (name: string): string => `${pageBuilder.escape(KEY_PAGE_ALIAS)}.${pageBuilder.escape(name)}`;

		pageBuilder
			.from((subQuery: SelectQueryBuilder<ObjectLiteral>): SelectQueryBuilder<ObjectLiteral> => {
				const keyBuilder: SelectQueryBuilder<ObjectLiteral> = subQuery.from(metadata.target, alias).setFindOptions(this.override(options, { order: undefined, skip: undefined, take: undefined }));
				const entityColumn: (column: TTypeOrmColumnMetadata) => string = (column: TTypeOrmColumnMetadata): string => `${keyBuilder.escape(alias)}.${keyBuilder.escape(column.databaseName)}`;

				keyBuilder.select([]);

				for (const [index, column] of primaryColumns.entries()) {
					keyBuilder.addSelect(`${entityColumn(column)}::text`, `key_${index}`).addSelect(entityColumn(column), `primary_${index}`);
				}

				for (const [index, order] of orders.entries()) {
					keyBuilder.addSelect(entityColumn(order.column), `order_${index}`);
				}

				return keyBuilder;
			}, KEY_PAGE_ALIAS)
			.select([])
			.distinct(true);

		for (const [index] of primaryColumns.entries()) {
			pageBuilder.addSelect(pageColumn(`key_${index}`), `key_${index}`).addSelect(pageColumn(`primary_${index}`), `primary_${index}`);
		}

		for (const [index, order] of orders.entries()) {
			pageBuilder.addSelect(pageColumn(`order_${index}`), `order_${index}`).addOrderBy(pageColumn(`order_${index}`), order.direction, order.nulls);
		}

		for (const column of tieBreakerColumns) {
			pageBuilder.addOrderBy(pageColumn(`primary_${primaryColumns.indexOf(column)}`), "ASC");
		}

		const keyRows: Array<Record<string, unknown>> = await pageBuilder.offset(options.skip).limit(options.take).getRawMany<Record<string, unknown>>();

		if (keyRows.length === 0) {
			return [];
		}

		const entityBuilder: SelectQueryBuilder<E> = this.createBuilder(repository, this.override(options, { skip: undefined, take: undefined }));
		const parameters: Record<string, string> = {};

		const keyConditions: Array<string> = keyRows.map((keyRow: Record<string, unknown>, rowIndex: number): string => {
			const columnConditions: Array<string> = primaryColumns.map((column: TTypeOrmColumnMetadata, columnIndex: number): string => {
				const parameterName: string = `${KEY_PAGE_PARAMETER_PREFIX}_${rowIndex}_${columnIndex}`;
				parameters[parameterName] = String(keyRow[`key_${columnIndex}`]);

				return `${entityBuilder.escape(alias)}.${entityBuilder.escape(column.databaseName)} = :${parameterName}`;
			});

			return `(${columnConditions.join(" AND ")})`;
		});

		entityBuilder.andWhere(`(${keyConditions.join(" OR ")})`, parameters);

		for (const column of tieBreakerColumns) {
			entityBuilder.addOrderBy(`${alias}.${column.propertyPath}`, "ASC");
		}

		return entityBuilder.getMany();
	}

	/**
	 * Derives find options that still read every property of the source options, inherited ones included.
	 * @template E The entity type
	 * @param {FindManyOptions<E>} options - Source find options
	 * @param {FindManyOptions<E>} overrides - Properties to replace
	 * @returns {FindManyOptions<E>} Derived find options
	 */
	private static override<E extends ObjectLiteral>(options: FindManyOptions<E>, overrides: FindManyOptions<E>): FindManyOptions<E> {
		return Object.assign(Object.create(options) as FindManyOptions<E>, overrides);
	}

	/**
	 * Resolves the find order into entity columns the way TypeORM reads it.
	 * @param {EntityMetadata} metadata - Metadata of the entity
	 * @param {unknown} order - Find order or an embedded part of it
	 * @param {string} [embedPrefix] - Property path of the embedded part
	 * @returns {Array<{ column: TTypeOrmColumnMetadata; direction: "ASC" | "DESC"; nulls?: "NULLS FIRST" | "NULLS LAST" }>} Ordered entity columns
	 * @throws {Error} When the order uses a relation, which a key page cannot order by
	 */
	private static resolveOrders(metadata: EntityMetadata, order: unknown, embedPrefix?: string): Array<{ column: TTypeOrmColumnMetadata; direction: "ASC" | "DESC"; nulls?: "NULLS FIRST" | "NULLS LAST" }> {
		const orders: Array<{ column: TTypeOrmColumnMetadata; direction: "ASC" | "DESC"; nulls?: "NULLS FIRST" | "NULLS LAST" }> = [];

		if (typeof order !== "object" || order === null) {
			return orders;
		}

		for (const [key, value] of Object.entries(order as Record<string, unknown>)) {
			if (value === undefined) {
				continue;
			}

			const propertyPath: string = embedPrefix ? `${embedPrefix}.${key}` : key;
			const column: TTypeOrmColumnMetadata | undefined = metadata.findColumnWithPropertyPathStrict(propertyPath);

			if (column) {
				const direction: unknown = typeof value === "object" && value !== null ? (value as { direction?: unknown }).direction : value;
				const nulls: unknown = typeof value === "object" && value !== null ? (value as { nulls?: unknown }).nulls : undefined;
				const normalizedNulls: string | undefined = typeof nulls === "string" ? nulls.toLowerCase() : undefined;

				orders.push({
					column,
					direction: direction === "DESC" || direction === "desc" || direction === -1 ? "DESC" : "ASC",
					...(normalizedNulls === "first" ? { nulls: "NULLS FIRST" } : {}),
					...(normalizedNulls === "last" ? { nulls: "NULLS LAST" } : {}),
				});

				continue;
			}

			if (metadata.findEmbeddedWithPropertyPath(propertyPath)) {
				orders.push(...this.resolveOrders(metadata, value, propertyPath));

				continue;
			}

			throw ErrorException(`Paged read of entity "${metadata.name}" cannot order by relation path "${propertyPath}": an entity with a temporal primary key and joined relations pages only by its own columns`);
		}

		return orders;
	}
}
