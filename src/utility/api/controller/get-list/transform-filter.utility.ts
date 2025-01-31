import type { FindOptionsWhere } from "typeorm/index";

import type { EFilterOperation } from "../../../../enum/filter-operation.enum";
import type { IApiEntity, IApiEntityColumn } from "../../../../interface";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "../../../../constant";
import { EApiPropertyDescribeType } from "../../../../enum";

import { ApiControllerGetListTransformOperation } from "./transform-operation.utility";

export function ApiControllerGetListTransformFilter<E>(query: Record<string, any>, entityMetadata: IApiEntity<E>): FindOptionsWhere<E> {
	const filter: FindOptionsWhere<E> = {};

	for (const fullKey of Object.keys(query)) {
		if (!fullKey.includes("[")) continue;

		const [key, field] = fullKey.split("[");
		const cleanField: string = field.replace("]", "");

		if (cleanField === "value" || cleanField === "values") {
			const operation: EFilterOperation = query[`${key}[operator]`] as EFilterOperation;
			// eslint-disable-next-line @elsikora-typescript/no-unsafe-assignment
			const value: any = query[fullKey];

			if (!operation || !key || value === undefined || value === null) continue;

			const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((column: IApiEntityColumn<E>) => column.name == key);

			// @ts-ignore
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
