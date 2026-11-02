import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { FindOptionsWhere } from "typeorm";

import { ApiControllerGetListQueryRuntime } from "@class/api/controller/get-list/query";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOperation } from "@enum/filter";
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
 * @throws {Error} A bad request with `INVALID_FILTER` when a numeric filter value is not a number
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

				filterRecord[key] = ApiControllerGetListTransformOperation(operation, isValuelessOperator ? value : parseNumericValue(value, columnMetadata));
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

				relationFilter[nestedPropertyName] = ApiControllerGetListTransformOperation(operation, isValuelessOperator ? value : parseNumericValue(value, nestedColumnMetadata));

				filterRecord[relationName] = relationFilter;
			}
		}
	}

	return filter;
}

/**
 * Converts the value or values of a numeric filter the way a typed filter does, so a raw string never reaches the database.
 * @param {unknown} value - Filter value, or the array of a values filter.
 * @param {TApiPropertyDescribeProperties} metadata - Described property metadata of the filtered column.
 * @returns {unknown} Parsed numbers for a numeric column; any other column keeps its value.
 */
function parseNumericValue(value: unknown, metadata: TApiPropertyDescribeProperties): unknown {
	if (metadata.type !== EApiPropertyDescribeType.NUMBER) {
		return value;
	}

	const field: { metadata: TApiPropertyDescribeProperties; type: EApiPropertyDescribeType } = { metadata, type: metadata.type };

	return Array.isArray(value) ? value.map((item: unknown): unknown => ApiControllerGetListQueryRuntime.parseFilterValue(item, field)) : ApiControllerGetListQueryRuntime.parseFilterValue(value, field);
}
