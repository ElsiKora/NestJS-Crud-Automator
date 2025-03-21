import type { Type } from "@nestjs/common";
import type { ObjectLiteral } from "typeorm";
import type { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";
import type { MetadataArgsStorage } from "typeorm/metadata-args/MetadataArgsStorage";

import type { EApiDtoType, EApiRouteType } from "../../enum";
import type { IApiEntity } from "../../interface";
import type { TApiFilterOrderBy, TFilterFieldSelector } from "../../type";

import { getMetadataArgsStorage } from "typeorm";

import { FILTER_API_INTERFACE_CONSTANT, PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "../../constant";

import "reflect-metadata";

export function FilterOrderByFromEntity<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, method: EApiRouteType, dtoType: EApiDtoType, fieldSelector?: TFilterFieldSelector<typeof entity>): TApiFilterOrderBy<typeof entity> {
	const metadata: MetadataArgsStorage = getMetadataArgsStorage();
	const columns: Array<ColumnMetadataArgs> = metadata.columns.filter((column: ColumnMetadataArgs) => column.target == entity);

	if (fieldSelector) {
		const entityFields: Set<string> = new Set<string>(columns.map((col: ColumnMetadataArgs) => col.propertyName));

		for (const field in fieldSelector) {
			if (!entityFields.has(field)) {
				throw new Error(`Field "${field}" does not exist in the entity.`);
			}
		}
	}

	const accumulator: TApiFilterOrderBy<typeof entity> = {};

	for (const column of columns) {
		const columnType: string | Type = (column.options?.type as string | Type) || (Reflect.getMetadata("design:type", entity.prototype as object, column.propertyName) as string | Type);

		const isAllowedType: boolean = (typeof columnType === "function" && (columnType === String || columnType === Number || columnType === Date)) || (FILTER_API_INTERFACE_CONSTANT.ALLOWED_ENTITY_TO_FILTER_COLUMNS.includes(columnType as string) && (fieldSelector === undefined || fieldSelector[column.propertyName as keyof typeof entity] !== false));

		if (isAllowedType) {
			for (const metadataColumn of entityMetadata.columns) {
				const metadata: Record<string, any> | undefined = metadataColumn.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME] as Record<string, any> | undefined;
				// eslint-disable-next-line @elsikora/typescript/no-unsafe-member-access
				const useAsFilter: boolean | undefined = (metadata?.properties?.[method]?.[dtoType]?.useAsOrderByFilter as boolean) ?? false;

				if (metadataColumn.name == column.propertyName && metadata && (useAsFilter == undefined || useAsFilter)) {
					const snakeUpperCase: string = column.propertyName
						// eslint-disable-next-line @elsikora/unicorn/prefer-spread
						.split("")
						.map((char: string, index: number): string => {
							if (index > 0 && char === char.toUpperCase() && char !== char.toLowerCase()) {
								return "_" + char;
							}

							return char;
						})
						.join("")
						.toUpperCase();

					accumulator[snakeUpperCase as keyof TApiFilterOrderBy<typeof entity>] = column.propertyName;
				}
			}
		}
	}

	return accumulator;
}
