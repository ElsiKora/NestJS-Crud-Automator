import type { FindOptionsWhere } from "typeorm/index";

import type { EFilterOperation } from "../../../../enum/filter-operation.enum";

import { ApiControllerGetListTransformOperation } from "./transform-operation.utility";

export function ApiControllerGetListTransformFilter<E>(query: Record<string, any>): FindOptionsWhere<E> {
	const filter: FindOptionsWhere<E> = {};

	for (const fullKey of Object.keys(query)) {
		if (!fullKey.includes("[")) continue;

		const [key, field] = fullKey.split("[");
		const cleanField: string = field.replace("]", "");

		if (cleanField === "value") {
			const operation: EFilterOperation = query[`${key}[operator]`] as EFilterOperation;
			// eslint-disable-next-line @elsikora-typescript/no-unsafe-assignment
			const value: any = query[fullKey];

			if (!operation || !key) continue;

			// @ts-ignore
			filter[key as keyof E] = ApiControllerGetListTransformOperation(operation, value);
		}
	}

	return filter;
}
