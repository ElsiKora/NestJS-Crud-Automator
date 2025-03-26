import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";

import { ApiControllerGetMethodName } from "@utility/api/controller/get-method-name.utility";
import { ErrorException } from "@utility/error-exception.utility";

/**
 * Creates controller methods dynamically.
 * Gets the method name, checks if it's already defined, and either
 * calls the implementation or throws an error if not implemented.
 * @param {Record<string, (method: EApiRouteType, methodName: string, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>) => void>} thisTarget - The object containing method implementations
 * @param {Record<string, unknown>} target - The target controller class to add methods to
 * @param {EApiRouteType} method - The type of route (CREATE, DELETE, GET, etc.)
 * @param {IApiControllerProperties<E>} properties - Controller configuration properties
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @returns {void}
 * @throws {Error} When the reserved method is already defined or method implementation is missing
 * @template E - The entity type
 */
export function ApiControllerWriteMethod<E>(thisTarget: Record<string, (method: EApiRouteType, methodName: string, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>) => void>, target: Record<string, unknown>, method: EApiRouteType, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
	const methodName: string = ApiControllerGetMethodName(method);

	if (target[methodName]) {
		throw ErrorException(`Reserved method ${methodName} already defined`);
	}

	if (thisTarget[method]) {
		thisTarget[method](method, methodName, properties, entityMetadata);
	} else {
		throw ErrorException(`Method ${methodName} not implemented`);
	}
}
