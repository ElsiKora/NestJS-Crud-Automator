import "reflect-metadata";

import { getMetadataArgsStorage } from "typeorm";

import { FILTER_API_INTERFACE_CONSTANT, PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "../../constant";

import type { EApiDtoType, EApiRouteType } from "../../enum";
import type { IApiEntity } from "../../interface";
import type { IApiFilterOrderBy, TFilterFieldSelector } from "../../type";

import type { ObjectLiteral } from "typeorm";
import type { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";
import type { MetadataArgsStorage } from "typeorm/metadata-args/MetadataArgsStorage";

export function FilterOrderByFromEntity(entity: ObjectLiteral, entityMetadata: IApiEntity, method: EApiRouteType, dtoType: EApiDtoType, fieldSelector?: TFilterFieldSelector<typeof entity>): IApiFilterOrderBy<typeof entity> {
	const metadata: MetadataArgsStorage = getMetadataArgsStorage();
	const columns: Array<ColumnMetadataArgs> = metadata.columns.filter((col) => col.target === entity);

	if (fieldSelector) {
		const entityFields = new Set<string>(columns.map((col) => col.propertyName));

		for (const field in fieldSelector) {
			if (!entityFields.has(field)) {
				throw new Error(`Field "${field}" does not exist in the entity.`);
			}
		}
	}

	return columns.reduce(
		(accumulator: IApiFilterOrderBy<typeof entity>, column: ColumnMetadataArgs) => {
			const columnType = column.options?.type || Reflect.getMetadata("design:type", entity.prototype, column.propertyName);

			if ((typeof columnType === "function" && (columnType === String || columnType === Number || columnType === Date)) || (FILTER_API_INTERFACE_CONSTANT.ALLOWED_ENTITY_TO_FILTER_COLUMNS.includes(columnType as string) && (fieldSelector === undefined || fieldSelector[column.propertyName as keyof typeof entity] !== false))) {
				for (const metadataColumn of entityMetadata.columns) {
					if (metadataColumn.name === column.propertyName && metadataColumn.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME] && (metadataColumn.metadata[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME]?.properties?.[method]?.[dtoType]?.filter === undefined || metadataColumn.metadata[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME]?.properties?.[method]?.[dtoType]?.filter === true)) {
						const snakeUpperCase: string = column.propertyName
							.split("")
							.map((char, index) => {
								if (index > 0 && char === char.toUpperCase() && char !== char.toLowerCase()) {
									return "_" + char;
								}

								return char;
							})
							.join("")
							.toUpperCase();

						accumulator[snakeUpperCase as keyof IApiFilterOrderBy<typeof entity>] = column.propertyName as any;
					}
				}
			}

			return accumulator;
		},
		{} as IApiFilterOrderBy<typeof entity>,
	);
}
