import { getMetadataArgsStorage } from "typeorm";

import type { IApiBaseEntity } from "../interface";

import type { IGetEntityColumnsProperties } from "../interface/utility/get-entity-columns-properties.interface";
import type { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";

export function GetEntityColumns<E extends IApiBaseEntity>(properties: IGetEntityColumnsProperties): Array<keyof E> {
	const { entity, shouldTakeGeneratedOnly }: IGetEntityColumnsProperties = properties;
	const columns: Array<ColumnMetadataArgs> = getMetadataArgsStorage().columns.filter((column: ColumnMetadataArgs) => column.target === entity);

	return columns.filter((column: ColumnMetadataArgs) => !shouldTakeGeneratedOnly || column.options.generated || column.options.default !== undefined).map((column: ColumnMetadataArgs) => column.propertyName) as Array<keyof E>;
}
