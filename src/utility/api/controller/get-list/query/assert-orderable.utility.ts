import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties } from "@interface/decorator/api/controller";
import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";

import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOrderDirection } from "@enum/filter";
import { BadRequestException } from "@nestjs/common";
import { ApiControllerGetListResponsePublishedFields } from "@utility/api/controller/get-list/response-published-fields.utility";
import { FilterOrderByFromEntity } from "@utility/api/filter-order-by-from-entity.utility";
import { EnumIsValue } from "@utility/enum/is-value.utility";
import { plainToClassFromExist } from "class-transformer";

const NOT_SENT: unique symbol = Symbol("NOT_SENT");
const ORDERABLE_FIELDS: WeakMap<object, ReadonlySet<string>> = new WeakMap<object, ReadonlySet<string>>();

/**
 * Refuses a client order outside the orderable fields and directions of a GET_LIST route without a query plan, whatever its QUERY DTO accepts, because ordering by a field reveals its values through row order.
 * It reads the values the DTO produced, so a DTO that exposes them under other query names is held to the same rule. A class default the client did not send stays the route's own order.
 * @template E - Entity type.
 * @param {IApiControllerProperties<E>} properties - Controller properties, which hold the route of this check.
 * @param {IApiEntity<E>} entityMetadata - Entity metadata.
 * @param {Type<unknown>} dto - The QUERY DTO of the route.
 * @param {object} requestQuery - The query the client sent.
 * @param {object} query - The query the DTO produced.
 * @returns {void}
 * @throws {BadRequestException} With `ORDER_NOT_VALID` when the route cannot order by the values.
 */
export function ApiControllerGetListQueryAssertOrderable<E extends IApiBaseEntity>(properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>, dto: Type<unknown>, requestQuery: object, query: object): void {
	const orderBy: unknown = Reflect.get(query, "orderBy");
	const orderDirection: unknown = Reflect.get(query, "orderDirection");

	if (isSentByClient(dto, requestQuery, "orderDirection", orderDirection) && !EnumIsValue(EFilterOrderDirection, orderDirection)) {
		throw new BadRequestException("ORDER_NOT_VALID");
	}

	if (!isSentByClient(dto, requestQuery, "orderBy", orderBy)) {
		return;
	}

	let orderableFields: ReadonlySet<string> | undefined = ORDERABLE_FIELDS.get(properties);

	if (!orderableFields) {
		const routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST> | undefined = properties.routes[EApiRouteType.GET_LIST];
		const responseDto: Parameters<typeof ApiControllerGetListResponsePublishedFields>[0] | undefined = routeConfig?.dto?.[EApiDtoType.RESPONSE];

		orderableFields = new Set<string>(Object.values(FilterOrderByFromEntity(properties.entity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, undefined, routeConfig?.security?.authentication?.guard, responseDto ? ApiControllerGetListResponsePublishedFields(responseDto) : undefined)).map(String));
		ORDERABLE_FIELDS.set(properties, orderableFields);
	}

	if (typeof orderBy !== "string" || !orderableFields.has(orderBy)) {
		throw new BadRequestException("ORDER_NOT_VALID");
	}
}

/**
 * Tells a value of the client from a class default of the QUERY DTO. Only a value equal to the default needs a second conversion, over an instance whose default is marked.
 * @param {Type<unknown>} dto - The QUERY DTO of the route.
 * @param {object} requestQuery - The query the client sent.
 * @param {string} property - The DTO property.
 * @param {unknown} value - The value the DTO produced.
 * @returns {boolean} Whether the client sent the value.
 */
function isSentByClient(dto: Type<unknown>, requestQuery: object, property: string, value: unknown): boolean {
	if (value === undefined) {
		return false;
	}

	const defaults: object = new dto() as object;

	if (value !== Reflect.get(defaults, property) || Reflect.get(requestQuery, property) !== undefined) {
		return true;
	}

	Reflect.set(defaults, property, NOT_SENT);

	const converted: unknown = Reflect.get(plainToClassFromExist(defaults, requestQuery), property);

	// An exposed property the query does not set is converted to undefined rather than left alone.
	return converted !== NOT_SENT && converted !== undefined;
}
