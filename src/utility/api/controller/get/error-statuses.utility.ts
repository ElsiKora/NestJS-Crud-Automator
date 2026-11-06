import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteRuntimeProperties } from "@interface/decorator/api/route/runtime-properties.interface";
import type { TApiException } from "@type/class";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";

import { EApiControllerRequestTarget, EApiRouteType } from "@enum/decorator/api";
import { HttpStatus } from "@nestjs/common";
import { ApiControllerHasResponseRelationInclude } from "@utility/api/controller/has-response-relation-include.utility";

/**
 * Resolves the error statuses a custom route raises from its own configuration, on top of the ones `ApiMethod` declares.
 * The route runtime runs the validators of each request target, a request relation reads its related row, and a response relation reads the returned row again; a missing row answers `404`.
 * @param {IApiRouteRuntimeProperties<E, undefined>} properties - Custom route runtime configuration.
 * @returns {Array<number>} Error statuses in ascending order, without duplicates.
 * @template E - The entity type
 */
export function ApiControllerGetCustomErrorStatuses<E extends IApiBaseEntity>(properties: Pick<IApiRouteRuntimeProperties<E, undefined>, "relations" | "request">): Array<number> {
	const statuses: Set<number> = new Set<number>(getValidatorStatuses(properties.request, [EApiControllerRequestTarget.PARAMETERS, EApiControllerRequestTarget.QUERY, EApiControllerRequestTarget.BODY]));

	if (hasEnabledRequestInclude(properties.relations?.request?.load?.include) || ApiControllerHasResponseRelationInclude(properties.relations?.response?.load?.include)) {
		statuses.add(HttpStatus.NOT_FOUND);
	}

	return [...statuses].toSorted((left: number, right: number): number => left - right);
}

/**
 * Resolves every error status a generated route can return with its configuration.
 * Every route can answer `400` (request DTO validation and package checks) and `500`. Row routes answer `404`, and CREATE does when it loads request relations; GET_LIST never does.
 * CREATE, both updates and DELETE can answer `409`: a duplicate key on a write, and a row still referenced by another row. `ApiMethod` adds the statuses of guards, throttling, and the body parser from the route metadata, and a securable controller adds `403` and the `404` of a CREATE outside its policy scope.
 * Each request validator the route runs adds the status of its exception.
 * @param {EApiRouteType} routeType - Generated route type.
 * @param {TApiControllerPropertiesRoute<E, EApiRouteType>} routeConfig - Route configuration.
 * @param {boolean} hasPathScope - Whether the controller binds path parameters, so CREATE and GET_LIST run their PARAMETERS target too.
 * @returns {Array<number>} Error statuses in ascending order, without duplicates.
 * @template E - The entity type
 */
export function ApiControllerGetErrorStatuses<E>(routeType: EApiRouteType, routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType>, hasPathScope: boolean): Array<number> {
	const statuses: Set<number> = new Set<number>([HttpStatus.BAD_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR]);

	if (routeType === EApiRouteType.CREATE ? hasEnabledRequestInclude(routeConfig.relations?.request?.load?.include) : routeType !== EApiRouteType.GET_LIST) {
		statuses.add(HttpStatus.NOT_FOUND);
	}

	if (routeType === EApiRouteType.CREATE || routeType === EApiRouteType.DELETE || routeType === EApiRouteType.PARTIAL_UPDATE || routeType === EApiRouteType.UPDATE) {
		statuses.add(HttpStatus.CONFLICT);
	}

	for (const status of getValidatorStatuses(routeConfig.request, getExecutedRequestTargets(routeType, hasPathScope))) {
		statuses.add(status);
	}

	return [...statuses].toSorted((left: number, right: number): number => left - right);
}

/**
 * Returns the request targets a generated route validates, in the order the route runtime runs them.
 * @param {EApiRouteType} routeType - Generated route type.
 * @param {boolean} hasPathScope - Whether the controller binds path parameters, so CREATE and GET_LIST run their PARAMETERS target too.
 * @returns {Array<EApiControllerRequestTarget>} Executed request targets.
 */
function getExecutedRequestTargets(routeType: EApiRouteType, hasPathScope: boolean): Array<EApiControllerRequestTarget> {
	switch (routeType) {
		case EApiRouteType.CREATE: {
			return hasPathScope ? [EApiControllerRequestTarget.PARAMETERS, EApiControllerRequestTarget.BODY] : [EApiControllerRequestTarget.BODY];
		}

		case EApiRouteType.DELETE: {
			return [EApiControllerRequestTarget.PARAMETERS];
		}

		case EApiRouteType.GET: {
			return [EApiControllerRequestTarget.PARAMETERS];
		}

		case EApiRouteType.GET_LIST: {
			return hasPathScope ? [EApiControllerRequestTarget.PARAMETERS, EApiControllerRequestTarget.QUERY] : [EApiControllerRequestTarget.QUERY];
		}

		case EApiRouteType.PARTIAL_UPDATE: {
			return [EApiControllerRequestTarget.PARAMETERS, EApiControllerRequestTarget.BODY];
		}

		case EApiRouteType.UPDATE: {
			return [EApiControllerRequestTarget.PARAMETERS, EApiControllerRequestTarget.BODY];
		}
	}
}

/**
 * Returns the statuses the validators of the executed request targets answer with.
 * @param {Partial<Record<EApiControllerRequestTarget, { validators?: ReadonlyArray<{ exception: TApiException }> }>> | undefined} request - Route request configuration.
 * @param {ReadonlyArray<EApiControllerRequestTarget>} targets - Request targets the route runs.
 * @returns {Array<number>} Status of each validator exception.
 */
function getValidatorStatuses(request: Partial<Record<EApiControllerRequestTarget, { validators?: ReadonlyArray<{ exception: TApiException }> }>> | undefined, targets: ReadonlyArray<EApiControllerRequestTarget>): Array<number> {
	return targets.flatMap((target: EApiControllerRequestTarget): Array<number> => (request?.[target]?.validators ?? []).map((validator: { exception: TApiException }): number => new validator.exception().getStatus()));
}

/**
 * Checks whether a request relation load reads at least one relation, since it skips a relation set to `false`.
 * @param {unknown} include - Request relation load include.
 * @returns {boolean} Whether a relation is read.
 */
function hasEnabledRequestInclude(include: unknown): boolean {
	return include !== null && typeof include === "object" && Object.values(include).some((value: unknown): boolean => value !== false && value !== undefined);
}
