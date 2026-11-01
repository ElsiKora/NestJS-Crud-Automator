import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiRequestValidator } from "@interface/api/request-validator.interface";
import type { IApiControllerPropertiesRouteBaseRequestTarget } from "@interface/decorator/api/controller/properties/route/base";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";

import { EApiControllerRequestTarget, EApiRouteType } from "@enum/decorator/api";
import { HttpStatus } from "@nestjs/common";

/**
 * Resolves every error status a generated route can return with its configuration.
 * Every route can answer `400` (request DTO validation and package checks) and `500`. Row routes answer `404`, and CREATE does when it loads request relations; GET_LIST never does.
 * CREATE and both updates can answer `409`. `401` needs an authentication guard and `403` a guard that can refuse; the securable authorization `403` is added by the controller.
 * Each request validator the route runs adds the status of its exception.
 * @param {EApiRouteType} routeType - Generated route type.
 * @param {TApiControllerPropertiesRoute<E, EApiRouteType>} routeConfig - Route configuration.
 * @param {boolean} hasReadPlan - Whether the GET_LIST route runs its path PARAMETERS target.
 * @returns {Array<number>} Error statuses in ascending order, without duplicates.
 * @template E - The entity type
 */
export function ApiControllerGetErrorStatuses<E>(routeType: EApiRouteType, routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType>, hasReadPlan: boolean): Array<number> {
	const statuses: Set<number> = new Set<number>([HttpStatus.BAD_REQUEST, HttpStatus.INTERNAL_SERVER_ERROR]);

	if (routeType === EApiRouteType.CREATE ? hasRequestRelationLoad(routeConfig) : routeType !== EApiRouteType.GET_LIST) {
		statuses.add(HttpStatus.NOT_FOUND);
	}

	if (routeType === EApiRouteType.CREATE || routeType === EApiRouteType.PARTIAL_UPDATE || routeType === EApiRouteType.UPDATE) {
		statuses.add(HttpStatus.CONFLICT);
	}

	if (routeConfig.security?.authentication) {
		statuses.add(HttpStatus.UNAUTHORIZED);
	}

	// Nest answers 403 for any guard that returns false
	if (routeConfig.security?.authentication || (routeConfig.execution?.guards?.length ?? 0) > 0) {
		statuses.add(HttpStatus.FORBIDDEN);
	}

	const requestTargets: Partial<Record<EApiControllerRequestTarget, IApiControllerPropertiesRouteBaseRequestTarget<E, EApiControllerGetListQueryPaginationMode>>> | undefined = routeConfig.request as Partial<Record<EApiControllerRequestTarget, IApiControllerPropertiesRouteBaseRequestTarget<E, EApiControllerGetListQueryPaginationMode>>> | undefined;

	for (const target of getExecutedRequestTargets(routeType, hasReadPlan)) {
		for (const validator of requestTargets?.[target]?.validators ?? []) {
			statuses.add(getValidatorStatus(validator));
		}
	}

	return [...statuses].toSorted((left: number, right: number): number => left - right);
}

/**
 * Returns the request targets a generated route validates, in the order the route runtime runs them.
 * @param {EApiRouteType} routeType - Generated route type.
 * @param {boolean} hasReadPlan - Whether the GET_LIST route runs its path PARAMETERS target.
 * @returns {Array<EApiControllerRequestTarget>} Executed request targets.
 */
function getExecutedRequestTargets(routeType: EApiRouteType, hasReadPlan: boolean): Array<EApiControllerRequestTarget> {
	switch (routeType) {
		case EApiRouteType.CREATE: {
			return [EApiControllerRequestTarget.BODY];
		}

		case EApiRouteType.DELETE: {
			return [EApiControllerRequestTarget.PARAMETERS];
		}

		case EApiRouteType.GET: {
			return [EApiControllerRequestTarget.PARAMETERS];
		}

		case EApiRouteType.GET_LIST: {
			return hasReadPlan ? [EApiControllerRequestTarget.PARAMETERS, EApiControllerRequestTarget.QUERY] : [EApiControllerRequestTarget.QUERY];
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
 * Returns the status a failed request validator answers with.
 * @param {IApiRequestValidator<E, EApiControllerGetListQueryPaginationMode>} validator - Request validator.
 * @returns {number} Status of the validator exception.
 * @template E - The entity type
 */
function getValidatorStatus<E>(validator: IApiRequestValidator<E, EApiControllerGetListQueryPaginationMode>): number {
	return new validator.exception().getStatus();
}

/**
 * Checks whether the route loads at least one request relation, whose missing target answers `404`.
 * @param {TApiControllerPropertiesRoute<E, EApiRouteType>} routeConfig - Route configuration.
 * @returns {boolean} Whether a request relation include is enabled.
 * @template E - The entity type
 */
function hasRequestRelationLoad<E>(routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType>): boolean {
	const include: unknown = routeConfig.relations?.request?.load?.include;

	return include !== null && typeof include === "object" && Object.values(include).some((value: unknown): boolean => value !== false && value !== undefined);
}
