import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiControllerGeneratedRouteFunction } from "@interface/utility/api/controller/generated-route-function.interface";

import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { EApiFunctionTransactionMode, EApiFunctionType, EApiRouteType } from "@enum/decorator/api";
import { ErrorException } from "@utility/error/exception.utility";

const WRITE_FAILURE: string = "when it writes";

const GET_FUNCTION: IApiControllerGeneratedRouteFunction = { decorator: "@ApiFunctionGet", failure: "when it reads its response, after any write it made", functionType: EApiFunctionType.GET, purpose: "reads its response through" };

/**
 * Service functions each generated route calls, in the order it calls them.
 */
const ROUTE_FUNCTIONS: ReadonlyArray<[EApiRouteType, ReadonlyArray<IApiControllerGeneratedRouteFunction>]> = [
	[EApiRouteType.CREATE, [{ decorator: "@ApiFunctionCreate", failure: WRITE_FAILURE, functionType: EApiFunctionType.CREATE, purpose: "writes through" }, GET_FUNCTION]],
	[EApiRouteType.DELETE, [{ decorator: "@ApiFunctionDelete", failure: WRITE_FAILURE, functionType: EApiFunctionType.DELETE, purpose: "writes through" }]],
	[EApiRouteType.GET, [GET_FUNCTION]],
	[EApiRouteType.PARTIAL_UPDATE, [{ decorator: "@ApiFunctionUpdate", failure: WRITE_FAILURE, functionType: EApiFunctionType.UPDATE, purpose: "writes through" }, GET_FUNCTION]],
	[EApiRouteType.UPDATE, [{ decorator: "@ApiFunctionUpdate", failure: WRITE_FAILURE, functionType: EApiFunctionType.UPDATE, purpose: "writes through" }, GET_FUNCTION]],
];

/**
 * Refuses a controller whose generated route calls a service function it cannot run.
 * Every function the route calls must be protected by its built-in decorator, and must be able to run in the transaction the route holds: MANDATORY needs the transaction that only a REQUIRED or MANDATORY route holds, and NONE refuses it.
 * @param {IApiControllerProperties<E>} properties - Properties of the controller.
 * @param {object} service - The `service` of the controller, whose repository the bootstrap already checked.
 * @param {string} controllerName - Controller named in the error.
 * @template E - The entity type
 * @throws {Error} When an enabled route calls a function the service does not protect with its built-in decorator, or one in a transaction mode it cannot run in.
 */
export function ApiControllerAssertGeneratedFunctions<E extends IApiBaseEntity>(properties: IApiControllerProperties<E>, service: object, controllerName: string): void {
	const serviceName: string = service.constructor.name;

	for (const [routeType, routeFunctions] of ROUTE_FUNCTIONS) {
		if (properties.routes[routeType]?.generation?.isEnabled === false) {
			continue;
		}

		const routeMode: EApiFunctionTransactionMode = properties.routes[routeType]?.transaction?.mode ?? EApiFunctionTransactionMode.SUPPORTS;
		const isTransactionHeld: boolean = routeMode === EApiFunctionTransactionMode.MANDATORY || routeMode === EApiFunctionTransactionMode.REQUIRED;

		for (const routeFunction of routeFunctions) {
			const { decorator, failure, functionType, purpose }: IApiControllerGeneratedRouteFunction = routeFunction;
			let functionMode: EApiFunctionTransactionMode;

			try {
				functionMode = ApiControllerGeneratedFunctionCapability.resolveTransactionMode(service, functionType, functionType, properties.entity);
			} catch {
				throw ErrorException(`Controller "${controllerName}" route "${routeType}" ${purpose} the ${functionType.toUpperCase()} function of service "${serviceName}", but that service has no ${functionType.toUpperCase()} function protected by its built-in decorator. Let @ApiService define it, or decorate the method with ${decorator} or @ApiFunction({ type: EApiFunctionType.${functionType.toUpperCase()} }).`);
			}

			if (functionMode === EApiFunctionTransactionMode.MANDATORY && !isTransactionHeld) {
				throw ErrorException(`Controller "${controllerName}" route "${routeType}" runs in transaction mode ${routeMode}, but the ${functionType.toUpperCase()} function of service "${serviceName}" runs in mode MANDATORY and needs a transaction the route does not hold, so the route would fail ${failure}. Set the route transaction mode to REQUIRED, or the ${functionType.toUpperCase()} function mode to SUPPORTS or REQUIRED.`);
			}

			if (functionMode === EApiFunctionTransactionMode.NONE && isTransactionHeld) {
				throw ErrorException(`Controller "${controllerName}" route "${routeType}" runs in transaction mode ${routeMode}, but the ${functionType.toUpperCase()} function of service "${serviceName}" runs in mode NONE and refuses the transaction the route holds, so the route would fail ${failure}. Set the route transaction mode to SUPPORTS, or the ${functionType.toUpperCase()} function mode to SUPPORTS or REQUIRED.`);
			}
		}
	}
}
