import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties } from "@interface/decorator/api/controller";
import type { IApiEntity } from "@interface/entity";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";

import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { BadRequestException } from "@nestjs/common";
import { ApiControllerGetListResponsePublishedFields } from "@utility/api/controller/get-list/response-published-fields.utility";
import { FilterOrderByFromEntity } from "@utility/api/filter-order-by-from-entity.utility";

const ORDERABLE_FIELDS: WeakMap<object, ReadonlySet<string>> = new WeakMap<object, ReadonlySet<string>>();

/**
 * Refuses a client orderBy outside the orderable fields of a GET_LIST route without a query plan, whatever its QUERY DTO accepts, because ordering by a field reveals its values through row order.
 * @template E - Entity type.
 * @param {IApiControllerProperties<E>} properties - Controller properties, which hold the route of this check.
 * @param {IApiEntity<E>} entityMetadata - Entity metadata.
 * @param {unknown} orderBy - The orderBy value the QUERY DTO produced for the client's value.
 * @returns {void}
 * @throws {BadRequestException} With `INVALID_ORDER` when the route cannot order by the value.
 */
export function ApiControllerGetListQueryAssertOrderable<E extends IApiBaseEntity>(properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>, orderBy: unknown): void {
	let orderableFields: ReadonlySet<string> | undefined = ORDERABLE_FIELDS.get(properties);

	if (!orderableFields) {
		const routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST> | undefined = properties.routes[EApiRouteType.GET_LIST];
		const responseDto: Parameters<typeof ApiControllerGetListResponsePublishedFields>[0] | undefined = routeConfig?.dto?.[EApiDtoType.RESPONSE];

		orderableFields = new Set<string>(Object.values(FilterOrderByFromEntity(properties.entity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, undefined, routeConfig?.security?.authentication?.guard, responseDto ? ApiControllerGetListResponsePublishedFields(responseDto) : undefined)).map(String));
		ORDERABLE_FIELDS.set(properties, orderableFields);
	}

	if (typeof orderBy !== "string" || !orderableFields.has(orderBy)) {
		throw new BadRequestException("INVALID_ORDER");
	}
}
