import type { IApiFunctionKeyPageLoaderRead, IApiFunctionKeyPageLoaderWalk } from "@interface/class/api/function/key-page-loader";
import type { TTypeOrmColumnMetadata } from "@type/utility/typeorm";
import type { DataSource, Driver, EntityMetadata, FindManyOptions, FindOneOptions, FindOperator, ObjectLiteral, QueryRunner, RelationMetadata, Repository, SelectQueryBuilder } from "typeorm";

import { ApiFunctionBoundOperator } from "@class/api/function/bound-operator.class";
import { DATABASE_COLUMN_TYPE_CONSTANT } from "@constant/database-column-type.constant";
import { DATABASE_DRIVER_TYPE_CONSTANT } from "@constant/database-driver-type.constant";
import { DatabaseTypeOrmBindInstant } from "@utility/database/typeorm/bind/instant.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";
import { InstanceChecker } from "typeorm";

const KEY_PAGE_ALIAS: string = "crud_automator_key_page";
const KEY_PAGE_PARAMETER_PREFIX: string = "crud_automator_page_key";

/**
 * Loads PostgreSQL and CockroachDB pages of entities that have a temporal primary key and joined relations.
 * TypeORM pages such reads in two steps and binds the parsed `Date` keys of the first step into the second one.
 * pg serializes a `Date` through a local offset truncated to whole minutes, so keys in historic zone offsets match no row.
 * The loader reads the page keys as PostgreSQL text and binds that text back, which keeps every instant exact.
 * Other drivers, entities without a temporal primary key and reads without joins or paging keep the repository methods.
 */
export class ApiFunctionKeyPageLoader {
	/**
	 * Rejects relation loads whose separate query would bind temporal values of the loaded entities.
	 * TypeORM loads "query" relations, `@RelationId` properties of to-many relations, and `loadRelationIds` of to-many relations by a query that binds the parsed `Date` values of the loaded entities, which pg serializes through a truncated local offset.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository of the read
	 * @param {IApiFunctionKeyPageLoaderRead} read - Relation options of the read as TypeORM find options take them
	 * @param {string} [source] - Configuration that requests the read, named in the error
	 * @throws {Error} When a relation load of the read binds a PostgreSQL date or timestamp column
	 */
	public static assertRelationLoad<E extends ObjectLiteral>(repository: Repository<E>, read: IApiFunctionKeyPageLoaderRead, source?: string): void {
		if (!this.isNodePostgres(repository)) {
			return;
		}

		const context: IApiFunctionKeyPageLoaderWalk = {
			checkedEntities: new Set<EntityMetadata>(),
			isEager: read.loadEagerRelations !== false,
			// TypeORM inherits the data-source strategy for every falsy per-query value.
			// eslint-disable-next-line @elsikora/typescript/prefer-nullish-coalescing
			isQueryStrategy: (read.relationLoadStrategy || repository.manager.dataSource.options.relationLoadStrategy) === "query",
			sourcePrefix: source ? source + ": " : "",
		};

		this.assertRelationIds(repository, repository.metadata, context);
		this.assertLoadedRelationIds(repository, read.loadRelationIds, context.sourcePrefix);
		this.assertRelationTree(repository, repository.metadata, this.createRelationTree(read.relations), "", context);
	}

	/**
	 * Finds entities and counts all matches like `Repository.findAndCount` with exact temporal page keys.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository to read from
	 * @param {FindManyOptions<E>} readOptions - Find options of the read
	 * @returns {Promise<[Array<E>, number]>} Entities of the page and the count of all matching entities
	 */
	public static async findAndCount<E extends ObjectLiteral>(repository: Repository<E>, readOptions: FindManyOptions<E>): Promise<[Array<E>, number]> {
		this.assertRelationLoad(repository, readOptions);

		const options: FindManyOptions<E> = this.bindOptions(repository, readOptions);

		if (!this.isRequired(repository, options)) {
			return repository.findAndCount(options);
		}

		return this.withQueryRunner(repository, async (queryRunner: QueryRunner): Promise<[Array<E>, number]> => {
			const items: Array<E> = await this.loadPage(repository, options, queryRunner);
			const totalCount: number = await this.createBuilder(repository, options, queryRunner).getCount();

			return [items, totalCount];
		});
	}

	/**
	 * Finds entities like `Repository.find` with exact temporal page keys.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository to read from
	 * @param {FindManyOptions<E>} readOptions - Find options of the read
	 * @returns {Promise<Array<E>>} Entities of the page
	 */
	public static async findMany<E extends ObjectLiteral>(repository: Repository<E>, readOptions: FindManyOptions<E>): Promise<Array<E>> {
		this.assertRelationLoad(repository, readOptions);

		const options: FindManyOptions<E> = this.bindOptions(repository, readOptions);

		if (!this.isRequired(repository, options)) {
			// eslint-disable-next-line @elsikora/unicorn/no-array-callback-reference -- Repository.find takes find options, not an array callback; a copy would drop inherited protected options.
			return repository.find(options);
		}

		return this.withQueryRunner(repository, (queryRunner: QueryRunner): Promise<Array<E>> => this.loadPage(repository, options, queryRunner));
	}

	/**
	 * Finds the first entity like `Repository.findOne` with exact temporal page keys.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository to read from
	 * @param {FindOneOptions<E>} readOptions - Find options of the read
	 * @returns {Promise<E | null>} The first matching entity, or null
	 */
	public static async findOne<E extends ObjectLiteral>(repository: Repository<E>, readOptions: FindOneOptions<E>): Promise<E | null> {
		this.assertRelationLoad(repository, readOptions);

		const options: FindOneOptions<E> = this.bindOptions(repository, readOptions);

		const pageOptions: FindManyOptions<E> = { ...options, take: 1 };

		if (!this.isRequired(repository, pageOptions)) {
			return repository.findOne(options);
		}

		const items: Array<E> = await this.withQueryRunner(repository, (queryRunner: QueryRunner): Promise<Array<E>> => this.loadPage(repository, pageOptions, queryRunner));

		return items[0] ?? null;
	}

	/**
	 * Rejects to-many `loadRelationIds` relations of the entity whose query binds a temporal column.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository of the read
	 * @param {unknown} loadRelationIds - Requested `loadRelationIds` find option
	 * @param {string} sourcePrefix - Configuration that requests the read, as the error prefix
	 * @throws {Error} When a requested relation id query binds a PostgreSQL date or timestamp column
	 */
	private static assertLoadedRelationIds<E extends ObjectLiteral>(repository: Repository<E>, loadRelationIds: unknown, sourcePrefix: string): void {
		if (!loadRelationIds) {
			return;
		}

		const relationPaths: unknown = typeof loadRelationIds === "object" ? (loadRelationIds as { relations?: unknown }).relations : undefined;

		for (const relation of repository.metadata.relations) {
			if (Array.isArray(relationPaths) && !relationPaths.includes(relation.propertyPath)) {
				continue;
			}

			const boundColumn: TTypeOrmColumnMetadata | undefined = this.findRelationIdBinding(repository, repository.metadata, relation);

			if (boundColumn) {
				throw this.createBindingError(`${sourcePrefix}loadRelationIds relation "${relation.propertyPath}" of entity "${repository.metadata.name}"`, boundColumn, 'load the relation with relationLoadStrategy: "join" instead');
			}
		}
	}

	/**
	 * Rejects `@RelationId` properties of the entity, and of its eager relations, whose query binds a temporal column.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository of the read
	 * @param {EntityMetadata} metadata - Metadata of an entity the read loads
	 * @param {IApiFunctionKeyPageLoaderWalk} context - Walk state of the read
	 * @param {boolean} [isEager] - Whether the read joins the eager relations of this entity
	 * @throws {Error} When a relation id query binds a PostgreSQL date or timestamp column
	 */
	private static assertRelationIds<E extends ObjectLiteral>(repository: Repository<E>, metadata: EntityMetadata, context: IApiFunctionKeyPageLoaderWalk, isEager: boolean = context.isEager): void {
		// Only an eager walk recurses, so only an eager walk can revisit an entity.
		if (isEager) {
			if (context.checkedEntities.has(metadata)) {
				return;
			}

			context.checkedEntities.add(metadata);
		}

		for (const relationId of metadata.relationIds) {
			const boundColumn: TTypeOrmColumnMetadata | undefined = this.findRelationIdBinding(repository, metadata, relationId.relation);

			if (boundColumn) {
				throw this.createBindingError(`${context.sourcePrefix}@RelationId property "${relationId.propertyName}" of entity "${metadata.name}"`, boundColumn, 'load the relation with relationLoadStrategy: "join" instead');
			}
		}

		if (isEager) {
			for (const relation of metadata.eagerRelations) {
				this.assertRelationIds(repository, relation.inverseEntityMetadata, context, true);
			}
		}
	}

	/**
	 * Walks requested relations and rejects the first load whose query binds a temporal column.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository of the read
	 * @param {EntityMetadata} metadata - Metadata of the entity that owns this level of relations
	 * @param {Record<string, unknown>} relationTree - Requested relations of this level
	 * @param {string} parentPath - Relation path of this level
	 * @param {IApiFunctionKeyPageLoaderWalk} context - Walk state of the read
	 * @param {string} [embedPrefix] - Property path of the embedded part of this level
	 * @throws {Error} When a relation load binds a PostgreSQL date or timestamp column
	 */
	private static assertRelationTree<E extends ObjectLiteral>(repository: Repository<E>, metadata: EntityMetadata, relationTree: Record<string, unknown>, parentPath: string, context: IApiFunctionKeyPageLoaderWalk, embedPrefix?: string): void {
		for (const [key, value] of Object.entries(relationTree)) {
			if (!value) {
				continue;
			}

			const propertyPath: string = embedPrefix ? `${embedPrefix}.${key}` : key;
			const relation: RelationMetadata | undefined = metadata.findRelationWithPropertyPath(propertyPath);

			if (!relation) {
				if (metadata.findEmbeddedWithPropertyPath(propertyPath) && typeof value === "object") {
					this.assertRelationTree(repository, metadata, value as Record<string, unknown>, parentPath, context, propertyPath);
				}

				continue;
			}

			const relationPath: string = parentPath ? `${parentPath}.${propertyPath}` : propertyPath;
			const boundColumn: TTypeOrmColumnMetadata | undefined = context.isQueryStrategy ? this.findRelationBinding(repository, metadata, relation) : undefined;

			if (boundColumn) {
				throw this.createBindingError(`${context.sourcePrefix}relation "${relationPath}" of entity "${repository.metadata.name}" with relationLoadStrategy "query"`, boundColumn, 'use relationLoadStrategy: "join"');
			}

			// A "query" relation loads through its own find, which joins eager relations whatever the read sets for loadEagerRelations.
			this.assertRelationIds(repository, relation.inverseEntityMetadata, context, context.isEager || context.isQueryStrategy);

			if (typeof value === "object") {
				this.assertRelationTree(repository, relation.inverseEntityMetadata, value as Record<string, unknown>, relationPath, context);
			}
		}
	}

	/**
	 * Binds every `Date` condition of a `timestamptz` column of a where branch, through its relations and embedded parts.
	 * @param {Driver} driver - Driver of the read
	 * @param {EntityMetadata} metadata - Metadata of the entity the branch filters
	 * @param {unknown} where - Where branch as TypeORM find options take it
	 * @param {string} [embedPrefix] - Property path of the embedded part the branch filters
	 * @returns {unknown} The branch itself when nothing binds, otherwise a bound copy
	 */
	private static bindBranch(driver: Driver, metadata: EntityMetadata, where: unknown, embedPrefix?: string): unknown {
		if (Array.isArray(where)) {
			const branches: Array<unknown> = where.map((branch: unknown): unknown => this.bindBranch(driver, metadata, branch, embedPrefix));

			return branches.some((branch: unknown, index: number): boolean => branch !== where[index]) ? branches : where;
		}

		if (typeof where !== "object" || where === null || InstanceChecker.isFindOperator(where) || where instanceof Date) {
			return where;
		}

		const bound: Record<string, unknown> = {};
		let isBound: boolean = false;

		// TypeORM reads every enumerable key of a where branch, inherited ones included.

		for (const key in where) {
			const condition: unknown = (where as Record<string, unknown>)[key];
			const propertyPath: string = embedPrefix ? `${embedPrefix}.${key}` : key;
			const relation: RelationMetadata | undefined = metadata.findRelationWithPropertyPath(propertyPath);
			const column: TTypeOrmColumnMetadata | undefined = metadata.findColumnWithPropertyPathStrict(propertyPath);
			let boundCondition: unknown = condition;

			if (relation && typeof condition === "object" && condition !== null && !InstanceChecker.isFindOperator(condition)) {
				boundCondition = this.bindBranch(driver, relation.inverseEntityMetadata, condition);
			} else if (column) {
				boundCondition = this.bindCondition(driver, column, condition);
			} else if (metadata.findEmbeddedWithPropertyPath(propertyPath)) {
				boundCondition = this.bindBranch(driver, metadata, condition, propertyPath);
			}

			bound[key] = boundCondition;
			isBound ||= boundCondition !== condition;
		}

		return isBound ? bound : where;
	}

	/**
	 * Binds the operands of a `timestamptz` column condition through the column transformers once, and a `Date` they return as canonical UTC text.
	 * A condition that binds so becomes operators that TypeORM binds without the column transformer, and a condition already bound so stays as it is.
	 * @param {Driver} driver - Driver of the read
	 * @param {TTypeOrmColumnMetadata} column - Column the condition filters
	 * @param {unknown} condition - Plain value or find operator of the column
	 * @returns {unknown} The condition itself when nothing binds, otherwise the bound condition
	 */
	private static bindCondition(driver: Driver, column: TTypeOrmColumnMetadata, condition: unknown): unknown {
		// A bound operator already went through the column transformer, so binding it again would hand the transformer its output.
		if (condition instanceof ApiFunctionBoundOperator) {
			return condition;
		}

		const columnType: string = driver.normalizeType(column);
		const driverType: string = driver.options.type;

		// A transformer may return a Date for any operand, so a transformed instant column binds every condition itself.
		const isInstantText: boolean = DATABASE_COLUMN_TYPE_CONSTANT.INSTANT.has(columnType) && DATABASE_DRIVER_TYPE_CONSTANT.NODE_POSTGRES.has(driverType) && (column.transformer !== undefined || this.hasDate(condition));
		// TypeORM hands the transformer the operators of a composed condition, so a transformed temporal column binds those itself.
		const isComposedTransform: boolean = column.transformer !== undefined && this.isTemporalType(columnType) && this.isComposed(condition);

		// TypeORM handles a null or undefined condition by its invalidWhereValuesBehavior option, without the transformer.
		if ((!isInstantText && !isComposedTransform) || condition === null || condition === undefined) {
			return condition;
		}

		// A bound operator keeps TypeORM from running the column transformer on it, so each operand TypeORM would transform runs through the helper instead.
		const bindOperand = (operand: unknown, isParameter: boolean): unknown => {
			if (InstanceChecker.isFindOperator(operand)) {
				const operator: FindOperator<unknown> = operand as FindOperator<unknown>;
				// The value getter unwraps a nested operator, while child keeps it.
				const value: unknown = operator.child ?? operator.value;
				const bindItem = (item: unknown): unknown => bindOperand(item, operator.useParameter);

				return new ApiFunctionBoundOperator<unknown>(Array.isArray(value) && operator.multipleParameters ? value.map((item: unknown): unknown => bindItem(item)) : bindItem(value), column.transformer, operator);
			}

			return isParameter ? DatabaseTypeOrmBindInstant(operand, columnType, driverType, column.transformer) : operand;
		};

		return InstanceChecker.isFindOperator(condition) ? bindOperand(condition, true) : new ApiFunctionBoundOperator<unknown>(bindOperand(condition, true), column.transformer);
	}

	/**
	 * Binds the `Date` conditions of PostgreSQL `timestamptz` columns as canonical UTC text, after the column transformer.
	 * pg serializes a `Date` through a local offset truncated to whole minutes, so filters, scopes, and keys of any read would miss the instant otherwise.
	 * @template O The find options type
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository of the read
	 * @param {O} options - Find options of the read
	 * @returns {O} The options themselves when nothing binds, otherwise a copy with the bound where clause and the same prototype
	 */
	private static bindOptions<O extends FindOneOptions<E>, E extends ObjectLiteral>(repository: Repository<E>, options: O): O {
		const where: unknown = options.where;
		const driver: Driver | undefined = (repository as Partial<Pick<Repository<E>, "manager">>).manager?.dataSource?.driver;

		if (!driver) {
			return options;
		}

		const boundWhere: unknown = this.bindBranch(driver, repository.metadata, where);

		if (boundWhere === where) {
			return options;
		}

		const boundOptions: O = Object.create(Object.getPrototypeOf(options) as null | object) as O;

		for (const key of Reflect.ownKeys(options)) {
			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(options, key);

			if (descriptor && key !== "where") {
				Object.defineProperty(boundOptions, key, descriptor);
			}
		}

		// eslint-disable-next-line @elsikora/typescript/naming-convention
		Object.defineProperty(boundOptions, "where", { configurable: true, enumerable: true, value: boundWhere, writable: true });

		return boundOptions;
	}

	/**
	 * Creates the error of a relation load that binds a temporal column and writes its exact text to the error log.
	 * Readers answer such an error with a generic server error, so the log is where the recipe stays visible.
	 * @param {string} subject - Relation load that fails, with its configuration
	 * @param {TTypeOrmColumnMetadata} column - Temporal column the load binds
	 * @param {string} recipe - Supported way to load the relation
	 * @returns {Error} Error to throw
	 */
	private static createBindingError(subject: string, column: TTypeOrmColumnMetadata, recipe: string): Error {
		const message: string = `${subject} cannot load because its query filters by the PostgreSQL date or timestamp column "${column.databaseName}" of entity "${column.entityMetadata.name}", which pg binds through a local offset truncated to whole minutes; ${recipe}`;

		LoggerUtility.getLogger("ApiFunctionKeyPageLoader").error(message);

		return ErrorException(message);
	}

	/**
	 * Creates a query builder the way `EntityManager.find` does.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository to read from
	 * @param {FindManyOptions<E>} options - Find options of the read
	 * @param {QueryRunner} [queryRunner] - Query runner of the read
	 * @returns {SelectQueryBuilder<E>} Query builder with the find options applied
	 */
	private static createBuilder<E extends ObjectLiteral>(repository: Repository<E>, options: FindManyOptions<E>, queryRunner?: QueryRunner): SelectQueryBuilder<E> {
		return repository.manager.createQueryBuilder<E>(repository.metadata.target, repository.metadata.name, queryRunner).setFindOptions(options);
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
	 * Finds the temporal column that a separate relation query binds from the loaded entities.
	 * The query filters by the primary key of the loaded entities, or by the join values on either side of the relation.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository of the read
	 * @param {EntityMetadata} metadata - Metadata of the loaded entities
	 * @param {RelationMetadata} relation - Relation the query loads
	 * @returns {TTypeOrmColumnMetadata | undefined} The bound PostgreSQL date or timestamp column, if any
	 */
	private static findRelationBinding<E extends ObjectLiteral>(repository: Repository<E>, metadata: EntityMetadata, relation: RelationMetadata): TTypeOrmColumnMetadata | undefined {
		const primaryColumn: TTypeOrmColumnMetadata | undefined = metadata.primaryColumns.find((column: TTypeOrmColumnMetadata): boolean => this.isTemporalColumn(repository, column));

		if (primaryColumn) {
			return primaryColumn;
		}

		// TypeORM 1 gives every join column the type of its referenced column, so the join columns alone tell the bound types.
		const joinColumns: Array<TTypeOrmColumnMetadata> = [...relation.joinColumns, ...relation.inverseJoinColumns, ...(relation.inverseRelation?.joinColumns ?? []), ...(relation.inverseRelation?.inverseJoinColumns ?? [])];

		return joinColumns.find((column: TTypeOrmColumnMetadata): boolean => this.isTemporalColumn(repository, column));
	}

	/**
	 * Finds the temporal column that the relation id query of a relation binds from the loaded entities.
	 * Ids of a many-to-one or owning one-to-one relation come from the loaded row itself, so only other relations run a query.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository of the read
	 * @param {EntityMetadata} metadata - Metadata of the loaded entities
	 * @param {RelationMetadata} relation - Relation whose ids load
	 * @returns {TTypeOrmColumnMetadata | undefined} The bound PostgreSQL date or timestamp column, if any
	 */
	private static findRelationIdBinding<E extends ObjectLiteral>(repository: Repository<E>, metadata: EntityMetadata, relation: RelationMetadata): TTypeOrmColumnMetadata | undefined {
		return relation.isManyToOne || relation.isOneToOneOwner ? undefined : this.findRelationBinding(repository, metadata, relation);
	}

	/**
	 * Tells whether a column condition holds a `Date`, also inside composed operators.
	 * @param {unknown} value - Plain value, find operator, or operand list
	 * @returns {boolean} True when a `Date` would bind
	 */
	private static hasDate(value: unknown): boolean {
		if (value instanceof Date) {
			return true;
		}

		if (InstanceChecker.isFindOperator(value)) {
			// The value getter unwraps nested operators down to their operands.
			return this.hasDate((value as FindOperator<unknown>).value);
		}

		return Array.isArray(value) && value.some((item: unknown): boolean => this.hasDate(item));
	}

	/**
	 * Tells whether a condition is an operator over a list of operators, such as `And`, also under `Not`.
	 * @param {unknown} condition - Condition of one column
	 * @returns {boolean} Whether TypeORM would hand the column transformer an operator
	 */
	private static isComposed(condition: unknown): boolean {
		if (!InstanceChecker.isFindOperator(condition)) {
			return false;
		}

		const operator: FindOperator<unknown> = condition as FindOperator<unknown>;

		// TypeORM transforms through Not itself, so only an operator list, also under Not, hands the transformer an operator.
		return operator.child === undefined ? Array.isArray(operator.value) && operator.value.some((item: unknown): boolean => InstanceChecker.isFindOperator(item)) : this.isComposed(operator.child);
	}

	/**
	 * Tells whether the repository reads through a driver that binds by node-postgres.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository of the read
	 * @returns {boolean} Whether the driver is PostgreSQL or CockroachDB
	 */
	private static isNodePostgres<E extends ObjectLiteral>(repository: Repository<E>): boolean {
		const dataSource: Partial<DataSource> | undefined = (repository as Partial<Pick<Repository<E>, "manager">>).manager?.dataSource;

		return DATABASE_DRIVER_TYPE_CONSTANT.NODE_POSTGRES.has(dataSource?.driver?.options.type ?? "");
	}

	/**
	 * Tells whether TypeORM would page the read in two steps over parsed temporal keys.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository to read from
	 * @param {FindManyOptions<E>} options - Find options of the read
	 * @returns {boolean} Whether the loader must page the read
	 */
	private static isRequired<E extends ObjectLiteral>(repository: Repository<E>, options: FindManyOptions<E>): boolean {
		if (!this.isNodePostgres(repository) || (!options.skip && !options.take)) {
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
		return this.isTemporalType(repository.manager.dataSource.driver.normalizeType(column));
	}

	/**
	 * Checks whether a driver-normalized column type stores a date, a date-time, or an instant.
	 * @param {string} columnType - Column type as the active driver normalizes it
	 * @returns {boolean} Whether the type is a date, date-time, or instant type
	 */
	private static isTemporalType(columnType: string): boolean {
		return DATABASE_COLUMN_TYPE_CONSTANT.DATE.has(columnType) || DATABASE_COLUMN_TYPE_CONSTANT.DATE_TIME.has(columnType) || DATABASE_COLUMN_TYPE_CONSTANT.INSTANT.has(columnType);
	}

	/**
	 * Loads one page: the keys first as PostgreSQL text, then the entities of exactly those keys.
	 * @template E The entity type
	 * @param {Repository<E>} repository - Repository to read from
	 * @param {FindManyOptions<E>} options - Find options of the read
	 * @param {QueryRunner} queryRunner - Query runner of both steps
	 * @returns {Promise<Array<E>>} Entities of the page in page order
	 */
	private static async loadPage<E extends ObjectLiteral>(repository: Repository<E>, options: FindManyOptions<E>, queryRunner: QueryRunner): Promise<Array<E>> {
		const metadata: EntityMetadata = repository.metadata;
		const alias: string = metadata.name;
		const primaryColumns: Array<TTypeOrmColumnMetadata> = metadata.primaryColumns;
		const orders: Array<{ column: TTypeOrmColumnMetadata; direction: "ASC" | "DESC"; nulls?: "NULLS FIRST" | "NULLS LAST" }> = this.resolveOrders(metadata, options.order);
		// Primary columns break ties in both steps; a column the find order already sorts keeps that direction.
		const tieBreakerColumns: Array<TTypeOrmColumnMetadata> = primaryColumns.filter((column: TTypeOrmColumnMetadata): boolean => !orders.some((order: { column: TTypeOrmColumnMetadata }): boolean => order.column === column));
		const pageBuilder: SelectQueryBuilder<ObjectLiteral> = repository.manager.createQueryBuilder(queryRunner) as SelectQueryBuilder<ObjectLiteral>;
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

		const entityBuilder: SelectQueryBuilder<E> = this.createBuilder(repository, this.override(options, { skip: undefined, take: undefined }), queryRunner);
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

			const message: string = `Paged read of entity "${metadata.name}" cannot order by relation path "${propertyPath}": an entity with a temporal primary key and joined relations pages only by its own columns`;

			LoggerUtility.getLogger("ApiFunctionKeyPageLoader").error(message);

			throw ErrorException(message);
		}

		return orders;
	}

	/**
	 * Runs every query of a loader read on one query runner, as TypeORM runs a paged read, so replicated reads never mix replicas.
	 * @template E The entity type
	 * @template R The read result type
	 * @param {Repository<E>} repository - Repository to read from
	 * @param {(queryRunner: QueryRunner) => Promise<R>} read - Queries of the read
	 * @returns {Promise<R>} Result of the read
	 */
	private static async withQueryRunner<E extends ObjectLiteral, R>(repository: Repository<E>, read: (queryRunner: QueryRunner) => Promise<R>): Promise<R> {
		const queryRunner: QueryRunner = repository.manager.queryRunner ?? repository.manager.dataSource.createQueryRunner(repository.manager.dataSource.defaultReplicationModeForReads());

		try {
			return await read(queryRunner);
		} finally {
			if (queryRunner !== repository.manager.queryRunner) {
				await queryRunner.release();
			}
		}
	}
}
