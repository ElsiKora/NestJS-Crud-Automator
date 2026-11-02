import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";

import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { EApiFunctionTransactionMode, EApiFunctionType, EApiRouteType } from "@enum/decorator/api";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Generated routes that read their response through the GET function of the service.
 */
const GET_READING_ROUTE_TYPES: ReadonlyArray<EApiRouteType> = [EApiRouteType.CREATE, EApiRouteType.GET, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE];

/**
 * Refuses a controller whose generated route cannot read its response through the GET function of its service.
 * The service must have a GET function protected by its built-in decorator, and that function must be able to run in the transaction the route holds: MANDATORY needs the transaction that only a REQUIRED or MANDATORY route holds, and NONE refuses it.
 * @param {IApiControllerProperties<E>} properties - Properties of the controller.
 * @param {object} service - The `service` of the controller, whose repository the bootstrap already checked.
 * @param {string} controllerName - Controller named in the error.
 * @template E - The entity type
 * @throws {Error} When an enabled route that reads through GET has no such GET function, or a transaction mode it cannot run in.
 */
export function ApiControllerAssertGeneratedGetFunction<E extends IApiBaseEntity>(properties: IApiControllerProperties<E>, service: object, controllerName: string): void {
	const routeTypes: Array<EApiRouteType> = GET_READING_ROUTE_TYPES.filter((routeType: EApiRouteType): boolean => properties.routes[routeType]?.generation?.isEnabled !== false);

	if (routeTypes.length === 0) {
		return;
	}

	const serviceName: string = service.constructor.name;
	let getMode: EApiFunctionTransactionMode;

	try {
		getMode = ApiControllerGeneratedFunctionCapability.resolveTransactionMode(service, EApiFunctionType.GET, EApiFunctionType.GET, properties.entity);
	} catch {
		throw ErrorException(`Controller "${controllerName}" route "${routeTypes[0]}" reads its response through the GET function of service "${serviceName}", but that service has no GET function protected by its built-in decorator. Let @ApiService define it, or decorate the method with @ApiFunctionGet or @ApiFunction({ type: EApiFunctionType.GET }).`);
	}

	for (const routeType of routeTypes) {
		const routeMode: EApiFunctionTransactionMode = properties.routes[routeType]?.transaction?.mode ?? EApiFunctionTransactionMode.SUPPORTS;

		if (getMode === EApiFunctionTransactionMode.MANDATORY && (routeMode === EApiFunctionTransactionMode.NONE || routeMode === EApiFunctionTransactionMode.SUPPORTS)) {
			throw ErrorException(`Controller "${controllerName}" route "${routeType}" runs in transaction mode ${routeMode}, but the GET function of service "${serviceName}" runs in mode MANDATORY and needs a transaction the route does not hold, so the route would fail when it reads its response, after any write it made. Set the route transaction mode to REQUIRED, or the GET function mode to SUPPORTS or REQUIRED.`);
		}

		if (getMode === EApiFunctionTransactionMode.NONE && (routeMode === EApiFunctionTransactionMode.MANDATORY || routeMode === EApiFunctionTransactionMode.REQUIRED)) {
			throw ErrorException(`Controller "${controllerName}" route "${routeType}" runs in transaction mode ${routeMode}, but the GET function of service "${serviceName}" runs in mode NONE and refuses the transaction the route holds, so the route would fail when it reads its response. Set the route transaction mode to SUPPORTS, or the GET function mode to SUPPORTS or REQUIRED.`);
		}
	}
}
