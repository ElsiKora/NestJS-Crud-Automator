import "reflect-metadata";

import {getMetadataArgsStorage, ObjectLiteral} from "typeorm";

import { API_FILTER_INTERFACE_CONSTANT } from "../../constant/interface/api/filter.constant";

import type { IApiFilterOrderBy, TFilterFieldSelector } from "../../type";
import type { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";
import type { MetadataArgsStorage } from "typeorm/metadata-args/MetadataArgsStorage";

export function FilterOrderByFromEntity(entity: ObjectLiteral, fieldSelector?: TFilterFieldSelector<typeof entity>): IApiFilterOrderBy<typeof entity> {
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

	return columns.reduce((accumulator: IApiFilterOrderBy<typeof entity>, column: ColumnMetadataArgs) => {
		const columnType = column.options?.type || Reflect.getMetadata("design:type", entity.prototype, column.propertyName);
		console.log("TYPE", column.propertyName, columnType);

		if ((typeof columnType === "function" && (columnType === String || columnType === Number || columnType === Date)) || (API_FILTER_INTERFACE_CONSTANT.ALLOWED_ENTITY_TO_FILTER_COLUMNS.includes(columnType as string) && (fieldSelector === undefined || fieldSelector[column.propertyName as keyof typeof entity] !== false))) {
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

		return accumulator;
	}, {} as IApiFilterOrderBy<typeof entity>);
}
