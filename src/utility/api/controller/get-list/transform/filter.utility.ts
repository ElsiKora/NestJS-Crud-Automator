import type { IApiEntity } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { FindOptionsWhere } from "typeorm";

import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { EFilterOperation } from "@enum/filter";
import { BadRequestException } from "@nestjs/common";
import { ApiControllerGetListQueryParseValue } from "@utility/api/controller/get-list/query/parse-value.utility";
import { ApiControllerGetListTransformGetFilterMetadata } from "@utility/api/controller/get-list/transform/get-filter-metadata.utility";
import { ApiControllerGetListTransformOperation } from "@utility/api/controller/get-list/transform/operation.utility";
import { EnumIsValue } from "@utility/enum/is-value.utility";

/**
 * Transforms query parameters into TypeORM FindOptionsWhere filter objects.
 * Parses query parameters with filter operations and converts them to appropriate database filters.
 * Handles special cases for relation properties.
 * A filter never answers unfiltered: a `<field>[operator]`, `<field>[value]` or `<field>[values]` key that cannot be applied is refused, and any other key is left to the QUERY DTO.
 * @param {Record<string, unknown>} query - The query parameters from the HTTP request
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {Type<CanActivate>} currentGuard - Optional guard used to mirror generated query DTO visibility.
 * @returns {FindOptionsWhere<E>} The TypeORM filter object for the query
 * @throws {Error} A bad request with `FILTER_NOT_VALID` when a number or uuid filter value is outside the published schema, or when a filter group is incomplete or names a field the route cannot apply
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

		// A route-before subscriber clears a key by setting it to undefined.
		if ((cleanField !== "operator" && cleanField !== "value" && cleanField !== "values") || query[fullKey] === undefined) continue;

		const operation: unknown = query[`${String(key)}[operator]`];
		const isValuelessOperator: boolean = operation === EFilterOperation.ISNULL || operation === EFilterOperation.NOTNULL;
		const hasValue: boolean = query[`${String(key)}[value]`] !== undefined;
		const hasValues: boolean = query[`${String(key)}[values]`] !== undefined;
		const isComplete: boolean = isValuelessOperator ? !hasValue && !hasValues : hasValue !== hasValues;
		const metadata: TApiPropertyDescribeProperties | undefined = key ? ApiControllerGetListTransformGetFilterMetadata(entityMetadata, key, currentGuard) : undefined;

		if (!key || !metadata || !EnumIsValue(EFilterOperation, operation) || !isComplete || query[fullKey] === null) {
			throw new BadRequestException("FILTER_NOT_VALID");
		}

		// The operator of a group with a value is applied from that value's key.
		if (cleanField === "operator" && !isValuelessOperator) continue;

		const condition: unknown = ApiControllerGetListTransformOperation(operation, parseFilterValue(operation, query[fullKey], metadata));
		const [relationName, nestedPropertyName]: Array<string | undefined> = key.split(".");

		if (relationName && nestedPropertyName) {
			filterRecord[relationName] = { ...(filterRecord[relationName] as Record<string, unknown> | undefined), [nestedPropertyName]: condition };
		} else {
			filterRecord[key] = condition;
		}
	}

	return filter;
}

/**
 * Parses the number, uuid, enum, and date values of a filter group into the values the query binds.
 * The QUERY DTO reads an empty number as 0 and takes the name of a numeric enum member, so the route parses the text the request carries before any SQL runs. A date-time binds as the Date it names, as on a typed route; a calendar date and a time of day stay text.
 * A value outside the published schema of the column answers 400 FILTER_NOT_VALID.
 * @param {EFilterOperation} operation - Filter operation of the group
 * @param {unknown} value - The `[value]` or `[values]` of the group as the request carries it
 * @param {TApiPropertyDescribeProperties} metadata - Describe metadata of the filtered column
 * @returns {unknown} The parsed value, or the value itself for an operation without one and for other column kinds
 */
function parseFilterValue(operation: EFilterOperation, value: unknown, metadata: TApiPropertyDescribeProperties): unknown {
	if (operation === EFilterOperation.ISNULL || operation === EFilterOperation.NOTNULL || (metadata.type !== EApiPropertyDescribeType.DATE && metadata.type !== EApiPropertyDescribeType.ENUM && metadata.type !== EApiPropertyDescribeType.NUMBER && metadata.type !== EApiPropertyDescribeType.UUID)) {
		return value;
	}

	return Array.isArray(value) ? value.map((item: unknown): unknown => ApiControllerGetListQueryParseValue(item, metadata)) : ApiControllerGetListQueryParseValue(value, metadata);
}
