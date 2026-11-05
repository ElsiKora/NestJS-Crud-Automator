import type { IApiAuthorizationIamCollection, IApiAuthorizationIamElement } from "@interface/class/api/authorization";
import type { IApiSubqueryJoinPair, IApiSubqueryJoinTable } from "@interface/class/api/subquery";
import type { TTypeOrmColumnMetadata } from "@type/utility/typeorm";
import type { DataSource, EntityMetadata, RelationMetadata } from "typeorm";

import { ApiSubqueryJoin } from "@class/api/subquery";

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

		const tables: ReadonlyArray<IApiSubqueryJoinTable> | undefined = ApiSubqueryJoin.readRelation(relation);
		const [first, second]: ReadonlyArray<IApiSubqueryJoinTable | undefined> = tables ?? [];
		const pair: IApiSubqueryJoinPair | undefined = first?.on[0];

		// A composite key has more than one pair, which this subquery does not write.
		if (!tables || !first || !pair || tables.some((joinTable: IApiSubqueryJoinTable): boolean => joinTable.on.length !== 1)) {
			return undefined;
		}

		const escape = (name: string): string => dataSource.driver.escape(name);
		const rowColumn = (column: TTypeOrmColumnMetadata): string => `${escape(IAM_COLLECTION_ROW_ALIAS)}.${escape(column.databaseName)}`;
		const linkColumn = (column: TTypeOrmColumnMetadata): string => `${escape(IAM_COLLECTION_LINK_ALIAS)}.${escape(column.databaseName)}`;
		const deleteDate: TTypeOrmColumnMetadata | undefined = target.deleteDateColumn;
		const secondPair: IApiSubqueryJoinPair | undefined = second?.on[0];

		return {
			correlationPath: pair.previous.propertyPath,
			element: rowColumn(elementColumn),
			elementPath: element.queryPath,
			from: second && secondPair ? `${ApiSubqueryJoin.writeTable(dataSource, first.metadata)} ${escape(IAM_COLLECTION_LINK_ALIAS)} INNER JOIN ${ApiSubqueryJoin.writeTable(dataSource, second.metadata)} ${escape(IAM_COLLECTION_ROW_ALIAS)} ON ${rowColumn(secondPair.column)} = ${linkColumn(secondPair.previous)}` : `${ApiSubqueryJoin.writeTable(dataSource, first.metadata)} ${escape(IAM_COLLECTION_ROW_ALIAS)}`,
			link: second ? linkColumn(pair.column) : rowColumn(pair.column),
			...(deleteDate ? { rowCondition: `${rowColumn(deleteDate)} IS NULL`, softDeletePath: deleteDate.propertyPath } : {}),
		};
	}
}
