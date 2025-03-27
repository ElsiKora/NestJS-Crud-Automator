import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { IApiControllerPrimaryColumn } from "@interface/utility";
import type { DeepPartial } from "typeorm";

/**
 * Extracts the primary key column and its value from an entity's metadata.
 * Used for CRUD operations that need to identify records by primary key.
 * @param {DeepPartial<E> | Partial<E>} parameters - The request parameters containing the primary key value
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @returns {IApiControllerPrimaryColumn<E> | undefined} The primary key information or undefined if no primary key is found
 * @template E - The entity type
 */
export function ApiControllerGetPrimaryColumn<E>(parameters: DeepPartial<E> | Partial<E>, entityMetadata: IApiEntity<E>): IApiControllerPrimaryColumn<E> | undefined {
	const primaryKeyColumn: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((column: IApiEntityColumn<E>): column is IApiEntityColumn<E> => column.isPrimary);

	if (!primaryKeyColumn) {
		return undefined;
	}

	return {
		key: primaryKeyColumn.name,
		value: parameters[primaryKeyColumn.name as keyof DeepPartial<E>] as string,
	};
}
