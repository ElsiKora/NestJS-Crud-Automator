import type { EFilterOperation } from "@enum/filter";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { FindOptionsWhere } from "typeorm";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { ApiControllerGetListTransformOperation } from "@utility/api/controller/get-list/transform/operation.utility";
import { DtoIsPropertyShouldBeMarked } from "@utility/dto/is/property/should-be-marked.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";

/**
 * Transforms query parameters into TypeORM FindOptionsWhere filter objects.
 * Parses query parameters with filter operations and converts them to appropriate database filters.
 * Handles special cases for relation properties.
 * @param {Record<string, unknown>} query - The query parameters from the HTTP request
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {Type<CanActivate>} currentGuard - Optional guard used to mirror generated query DTO visibility.
 * @returns {FindOptionsWhere<E>} The TypeORM filter object for the query
 * @template E - The entity type
 */
export function ApiControllerGetListTransformFilter<E>(query: Record<string, unknown>, entityMetadata: IApiEntity<E>, currentGuard?: Type<CanActivate>): FindOptionsWhere<E> {
	const filter: FindOptionsWhere<E> = {};
	const filterRecord: Record<string, unknown> = filter;

	for (const fullKey of Object.keys(query)) {
		if (!fullKey.includes("[")) continue;

		const [key, field]: Array<string> = fullKey.split("[");

		if (!field) continue;

		const cleanField: string = field.replace("]", "");

		if (cleanField === "value" || cleanField === "values") {
			const operation: EFilterOperation = query[`${String(key)}[operator]`] as EFilterOperation;

			const value: unknown = query[fullKey];

			if (!operation || !key || value === undefined || value === null) continue;

			const path: Array<string> = key.split(".");

			if (path.length === 1) {
				const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((column: IApiEntityColumn<E>) => column.name == key);
				const columnMetadata: TApiPropertyDescribeProperties | undefined = column?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

				if (!column || !columnMetadata || !DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, key, columnMetadata, column.isPrimary, currentGuard) || columnMetadata.type === EApiPropertyDescribeType.RELATION) continue;

				filterRecord[key] = ApiControllerGetListTransformOperation(operation, value);
			} else {
				// eslint-disable-next-line @elsikora/typescript/no-magic-numbers
				if (path.length !== 2) continue;

				const [relationName, nestedPropertyName]: Array<string | undefined> = path;

				if (!relationName || !nestedPropertyName) continue;

				const relationColumn: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((column: IApiEntityColumn<E>) => column.name == relationName);
				const relationMetadata: TApiPropertyDescribeProperties | undefined = relationColumn?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

				if (!relationColumn || relationMetadata?.type !== EApiPropertyDescribeType.RELATION || !relationColumn.relation?.target || !DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, relationName, relationMetadata, relationColumn.isPrimary, currentGuard)) continue;

				let relationEntityMetadata: IApiEntity<unknown>;

				try {
					relationEntityMetadata = GenerateEntityInformation(relationColumn.relation.target);
				} catch {
					continue;
				}

				const nestedColumn: IApiEntityColumn<unknown> | undefined = relationEntityMetadata.columns.find((column: IApiEntityColumn<unknown>) => column.name == nestedPropertyName);
				const nestedColumnMetadata: TApiPropertyDescribeProperties | undefined = nestedColumn?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

				if (!nestedColumn || !nestedColumnMetadata || nestedColumnMetadata.type === EApiPropertyDescribeType.RELATION || nestedColumnMetadata.type === EApiPropertyDescribeType.OBJECT) continue;

				if (!DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, nestedPropertyName, nestedColumnMetadata, false, currentGuard)) continue;

				const relationFilter: Record<string, unknown> = (filterRecord[relationName] ?? {}) as Record<string, unknown>;

				relationFilter[nestedPropertyName] = ApiControllerGetListTransformOperation(operation, value);

				filterRecord[relationName] = relationFilter;
			}
		}
	}

	return filter;
}
