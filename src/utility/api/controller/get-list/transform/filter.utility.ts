import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { FindOptionsWhere } from "typeorm";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOperation } from "@enum/filter";
import { ApiControllerGetListQueryParseValue } from "@utility/api/controller/get-list/query/parse-value.utility";
import { ApiControllerGetListTransformGetRelationTarget } from "@utility/api/controller/get-list/transform/get-relation-target.utility";
import { ApiControllerGetListTransformOperation } from "@utility/api/controller/get-list/transform/operation.utility";
import { DtoIsPropertyShouldBeMarked } from "@utility/dto/is/property/should-be-marked.utility";
import { EnumIsValue } from "@utility/enum/is-value.utility";
import { GenerateRelationEntityInformation } from "@utility/generate-relation-entity-information.utility";

/**
 * Transforms query parameters into TypeORM FindOptionsWhere filter objects.
 * Parses query parameters with filter operations and converts them to appropriate database filters.
 * Handles special cases for relation properties.
 * @param {Record<string, unknown>} query - The query parameters from the HTTP request
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {Type<CanActivate>} currentGuard - Optional guard used to mirror generated query DTO visibility.
 * @returns {FindOptionsWhere<E>} The TypeORM filter object for the query
 * @throws {Error} A bad request with `INVALID_FILTER` when a number or uuid filter value is outside the published schema
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

		const operation: unknown = query[`${String(key)}[operator]`];
		const isValuelessOperator: boolean = cleanField === "operator" && (operation === EFilterOperation.ISNULL || operation === EFilterOperation.NOTNULL);

		if (cleanField === "value" || cleanField === "values" || isValuelessOperator) {
			const value: unknown = query[fullKey];

			if (!EnumIsValue(EFilterOperation, operation) || !key || value === undefined || value === null) continue;

			const path: Array<string> = key.split(".");

			if (path.length === 1) {
				const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((column: IApiEntityColumn<E>) => column.name == key);
				const columnMetadata: TApiPropertyDescribeProperties | undefined = column?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

				if (!column || !columnMetadata || !DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, key, columnMetadata, column.isPrimary, currentGuard) || columnMetadata.type === EApiPropertyDescribeType.RELATION) continue;

				filterRecord[key] = ApiControllerGetListTransformOperation(operation, parseFilterValue(operation, value, columnMetadata));
			} else {
				// eslint-disable-next-line @elsikora/typescript/no-magic-numbers
				if (path.length !== 2) continue;

				const [relationName, nestedPropertyName]: Array<string | undefined> = path;

				if (!relationName || !nestedPropertyName) continue;

				const relationTarget: IApiBaseEntity | undefined = ApiControllerGetListTransformGetRelationTarget(entityMetadata, relationName, currentGuard);

				if (!relationTarget) continue;

				const relationEntityMetadata: IApiEntity<unknown> | undefined = GenerateRelationEntityInformation(relationTarget);

				if (!relationEntityMetadata) continue;

				const nestedColumn: IApiEntityColumn<unknown> | undefined = relationEntityMetadata.columns.find((column: IApiEntityColumn<unknown>) => column.name == nestedPropertyName);
				const nestedColumnMetadata: TApiPropertyDescribeProperties | undefined = nestedColumn?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

				if (!nestedColumn || !nestedColumnMetadata || nestedColumnMetadata.type === EApiPropertyDescribeType.RELATION || nestedColumnMetadata.type === EApiPropertyDescribeType.OBJECT) continue;

				if (!DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, nestedPropertyName, nestedColumnMetadata, false, currentGuard)) continue;

				const relationFilter: Record<string, unknown> = (filterRecord[relationName] ?? {}) as Record<string, unknown>;

				relationFilter[nestedPropertyName] = ApiControllerGetListTransformOperation(operation, parseFilterValue(operation, value, nestedColumnMetadata));

				filterRecord[relationName] = relationFilter;
			}
		}
	}

	return filter;
}

/**
 * Parses the number and uuid values of a filter group into the values the query binds.
 * The QUERY DTO reads an empty number as 0, so the route parses the text the request carries before any SQL runs.
 * A value outside the published schema of the column answers 400 INVALID_FILTER.
 * @param {EFilterOperation} operation - Filter operation of the group
 * @param {unknown} value - The `[value]` or `[values]` of the group as the request carries it
 * @param {TApiPropertyDescribeProperties} metadata - Describe metadata of the filtered column
 * @returns {unknown} The parsed value, or the value itself for an operation without one and for other column kinds
 */
function parseFilterValue(operation: EFilterOperation, value: unknown, metadata: TApiPropertyDescribeProperties): unknown {
	if (operation === EFilterOperation.ISNULL || operation === EFilterOperation.NOTNULL || (metadata.type !== EApiPropertyDescribeType.NUMBER && metadata.type !== EApiPropertyDescribeType.UUID)) {
		return value;
	}

	return Array.isArray(value) ? value.map((item: unknown): unknown => ApiControllerGetListQueryParseValue(item, metadata)) : ApiControllerGetListQueryParseValue(value, metadata);
}
