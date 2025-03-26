import type { EFilterOperation } from "@enum/filter-operation.enum";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { FindOptionsWhere } from "typeorm/index";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiPropertyDescribeType } from "@enum/decorator/api";

import { ApiControllerGetListTransformOperation } from "./transform-operation.utility";

/**
 * Transforms query parameters into TypeORM FindOptionsWhere filter objects.
 * Parses query parameters with filter operations and converts them to appropriate database filters.
 * Handles special cases for relation properties.
 * @param {Record<string, any>} query - The query parameters from the HTTP request
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @returns {FindOptionsWhere<E>} The TypeORM filter object for the query
 * @template E - The entity type
 */
export function ApiControllerGetListTransformFilter<E>(query: Record<string, any>, entityMetadata: IApiEntity<E>): FindOptionsWhere<E> {
	const filter: FindOptionsWhere<E> = {};

	for (const fullKey of Object.keys(query)) {
		if (!fullKey.includes("[")) continue;

		const [key, field]: Array<string> = fullKey.split("[");

		if (!field) continue;

		const cleanField: string = field.replace("]", "");

		if (cleanField === "value" || cleanField === "values") {
			const operation: EFilterOperation = query[`${String(key)}[operator]`] as EFilterOperation;
			// eslint-disable-next-line @elsikora/typescript/no-unsafe-assignment
			const value: any = query[fullKey];

			if (!operation || !key || value === undefined || value === null) continue;

			const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((column: IApiEntityColumn<E>) => column.name == key);

			// @ts-ignore
			// eslint-disable-next-line @elsikora/typescript/no-unsafe-member-access
			if (column && column.metadata[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME].type === EApiPropertyDescribeType.RELATION) {
				// @ts-ignore
				filter[key as keyof E] = { id: ApiControllerGetListTransformOperation(operation, value) };
			} else {
				// @ts-ignore
				filter[key as keyof E] = ApiControllerGetListTransformOperation(operation, value);
			}
		}
	}

	return filter;
}
