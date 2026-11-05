import type { IApiAuthorizationIamCollection, IApiAuthorizationIamElement } from "@interface/class/api/authorization";
import type { TTypeOrmColumnMetadata } from "@type/utility/typeorm";
import type { DataSource, EntityMetadata, RelationMetadata } from "typeorm";

// Alias of a related row inside the subquery.
const IAM_COLLECTION_ROW_ALIAS: string = "iam_collection_row";

// Alias of a junction row inside the subquery of a ManyToMany.
const IAM_COLLECTION_LINK_ALIAS: string = "iam_collection_link";

// Table type TypeORM gives an entity that shares the table of its single-table-inheritance parent.
const IAM_COLLECTION_ENTITY_CHILD_TABLE_TYPE: string = "entity-child";

/**
 * Reads the correlated subquery of a to-many relation of an IAM resource entity from the entity metadata of the
 * DataSource that reads it. Only what the relation loads exactly is accepted: a `OneToMany` or a `ManyToMany` of the
 * resource itself with one join column on each side, onto an entity that does not share its table with other entity
 * types. A soft-deletable related entity counts only rows that are not deleted, as TypeORM loads a relation. Anything
 * else reads as nothing, and the key fails closed.
 */
export class ApiAuthorizationIamCollection {
	/**
	 * Reads the subquery of the to-many relation a query path crosses.
	 * @param {DataSource | undefined} dataSource - The one DataSource that reads the resource entity.
	 * @param {object} entity - Resource entity class.
	 * @param {IApiAuthorizationIamElement} element - The relation and the column of a related row the path reads.
	 * @returns {IApiAuthorizationIamCollection | undefined} The subquery, or undefined when the relation cannot be read exactly.
	 */
	public static read(dataSource: DataSource | undefined, entity: object, element: IApiAuthorizationIamElement): IApiAuthorizationIamCollection | undefined {
		if (!dataSource?.hasMetadata(entity as never)) {
			return undefined;
		}

		const metadata: EntityMetadata = dataSource.getMetadata(entity as never);
		const relation: RelationMetadata | undefined = metadata.findRelationWithPropertyPath(element.relationPath);

		if (!relation || (!relation.isOneToMany && !relation.isManyToMany) || relation.inverseEntityMetadata.tableType === IAM_COLLECTION_ENTITY_CHILD_TABLE_TYPE) {
			return undefined;
		}

		const target: EntityMetadata = relation.inverseEntityMetadata;
		const elementColumn: TTypeOrmColumnMetadata | undefined = target.findColumnWithPropertyPath(element.queryPath);

		if (!elementColumn || elementColumn.relationMetadata) {
			return undefined;
		}

		const escape = (name: string): string => dataSource.driver.escape(name);
		const rowColumn = (column: TTypeOrmColumnMetadata): string => `${escape(IAM_COLLECTION_ROW_ALIAS)}.${escape(column.databaseName)}`;

		const table = (tableMetadata: EntityMetadata): string =>
			tableMetadata.tablePath
				.split(".")
				.map((part: string): string => escape(part))
				.join(".");
		const deleteDate: TTypeOrmColumnMetadata | undefined = target.deleteDateColumn;
		const shape: { correlation: TTypeOrmColumnMetadata; from: string; link: string } | undefined = relation.isOneToMany ? ApiAuthorizationIamCollection.readOneToMany(relation, escape, rowColumn, table) : ApiAuthorizationIamCollection.readManyToMany(relation, escape, rowColumn, table);

		if (!shape) {
			return undefined;
		}

		return {
			correlationPath: shape.correlation.propertyPath,
			element: rowColumn(elementColumn),
			elementPath: element.queryPath,
			from: shape.from,
			link: shape.link,
			...(deleteDate ? { rowCondition: `${rowColumn(deleteDate)} IS NULL`, softDeletePath: deleteDate.propertyPath } : {}),
		};
	}

	/**
	 * Reads a ManyToMany: the junction table, joined to the related table.
	 * @param {RelationMetadata} relation - The relation, on either side.
	 * @param {(name: string) => string} escape - Escapes one name for the driver.
	 * @param {(column: TTypeOrmColumnMetadata) => string} rowColumn - Writes a column of a related row.
	 * @param {(tableMetadata: EntityMetadata) => string} table - Writes a table name.
	 * @returns {{ correlation: TTypeOrmColumnMetadata; from: string; link: string } | undefined} The resource column, the FROM clause and the linking column, or undefined for a composite key.
	 */
	private static readManyToMany(relation: RelationMetadata, escape: (name: string) => string, rowColumn: (column: TTypeOrmColumnMetadata) => string, table: (tableMetadata: EntityMetadata) => string): { correlation: TTypeOrmColumnMetadata; from: string; link: string } | undefined {
		const junction: EntityMetadata | undefined = relation.junctionEntityMetadata;
		// The owner side holds the junction columns; the inverse side reads them swapped.
		const ownerColumns: Array<TTypeOrmColumnMetadata> = relation.isOwning ? relation.joinColumns : (relation.inverseRelation?.inverseJoinColumns ?? []);
		const targetColumns: Array<TTypeOrmColumnMetadata> = relation.isOwning ? relation.inverseJoinColumns : (relation.inverseRelation?.joinColumns ?? []);
		const [ownerColumn]: Array<TTypeOrmColumnMetadata> = ownerColumns;
		const [targetColumn]: Array<TTypeOrmColumnMetadata> = targetColumns;

		if (!junction || ownerColumns.length !== 1 || targetColumns.length !== 1 || !ownerColumn?.referencedColumn || !targetColumn?.referencedColumn) {
			return undefined;
		}

		const linkColumn = (column: TTypeOrmColumnMetadata): string => `${escape(IAM_COLLECTION_LINK_ALIAS)}.${escape(column.databaseName)}`;

		return {
			correlation: ownerColumn.referencedColumn,
			from: `${table(junction)} ${escape(IAM_COLLECTION_LINK_ALIAS)} INNER JOIN ${table(relation.inverseEntityMetadata)} ${escape(IAM_COLLECTION_ROW_ALIAS)} ON ${rowColumn(targetColumn.referencedColumn)} = ${linkColumn(targetColumn)}`,
			link: linkColumn(ownerColumn),
		};
	}

	/**
	 * Reads a OneToMany: the related table, whose join column refers to the resource.
	 * @param {RelationMetadata} relation - The relation.
	 * @param {(name: string) => string} escape - Escapes one name for the driver.
	 * @param {(column: TTypeOrmColumnMetadata) => string} rowColumn - Writes a column of a related row.
	 * @param {(tableMetadata: EntityMetadata) => string} table - Writes a table name.
	 * @returns {{ correlation: TTypeOrmColumnMetadata; from: string; link: string } | undefined} The resource column, the FROM clause and the linking column, or undefined for a composite key.
	 */
	private static readOneToMany(relation: RelationMetadata, escape: (name: string) => string, rowColumn: (column: TTypeOrmColumnMetadata) => string, table: (tableMetadata: EntityMetadata) => string): { correlation: TTypeOrmColumnMetadata; from: string; link: string } | undefined {
		const joinColumns: Array<TTypeOrmColumnMetadata> = relation.inverseRelation?.joinColumns ?? [];
		const [joinColumn]: Array<TTypeOrmColumnMetadata> = joinColumns;

		if (joinColumns.length !== 1 || !joinColumn?.referencedColumn) {
			return undefined;
		}

		return { correlation: joinColumn.referencedColumn, from: `${table(relation.inverseEntityMetadata)} ${escape(IAM_COLLECTION_ROW_ALIAS)}`, link: rowColumn(joinColumn) };
	}
}
