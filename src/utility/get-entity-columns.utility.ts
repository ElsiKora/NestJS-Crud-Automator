import type { IGetEntityColumnsProperties } from "@interface/utility/get-entity-columns-properties.interface";
import type { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";
import type { RelationMetadataArgs } from "typeorm/metadata-args/RelationMetadataArgs";

import { getMetadataArgsStorage } from "typeorm";

/**
 * Retrieves column and relation property names from an entity based on specified filters
 * @param {IGetEntityColumnsProperties} properties - Configuration options for retrieving entity columns
 * @returns {Array<keyof E>} Array of property names from the entity
 * @template E - The entity type
 */
export function GetEntityColumns<E>(properties: IGetEntityColumnsProperties): Array<keyof E> {
	const { entity, shouldTakeGeneratedOnly, shouldTakeRelationsOnly }: IGetEntityColumnsProperties = properties;

	const columns: Array<ColumnMetadataArgs> = getMetadataArgsStorage().columns.filter((column: ColumnMetadataArgs) => column.target == entity);

	const relations: Array<RelationMetadataArgs> = getMetadataArgsStorage().relations.filter((relation: RelationMetadataArgs) => relation.target == entity);

	let columnNames: Array<keyof E>;

	if (shouldTakeRelationsOnly) {
		columnNames = relations.map((relation: RelationMetadataArgs) => relation.propertyName) as Array<keyof E>;
	} else {
		// eslint-disable-next-line @elsikora/typescript/prefer-nullish-coalescing
		const columnPropertyNames: Array<keyof E> = columns.filter((column: ColumnMetadataArgs) => !shouldTakeGeneratedOnly || column.options.generated || column.options.default !== undefined).map((column: ColumnMetadataArgs) => column.propertyName) as Array<keyof E>;

		const relationNames: Array<keyof E> = relations.map((relation: RelationMetadataArgs) => relation.propertyName) as Array<keyof E>;

		columnNames = [...columnPropertyNames, ...relationNames];
	}

	return columnNames;
}
