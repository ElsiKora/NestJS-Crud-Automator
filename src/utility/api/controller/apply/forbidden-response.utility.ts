import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";

import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { HttpStatus } from "@nestjs/common";
import { ApiForbiddenResponse } from "@nestjs/swagger";
import { DtoGenerateException } from "@utility/dto/generate/exception.utility";

/**
 * Declares `403` on every route of a securable controller with an authorization block, generated and custom alike.
 * The authorization guard runs on each `ApiMethod` route and refuses denied requests, and the handler refuses CREATE and UPDATE scope violations.
 * `@ApiController` and `@ApiControllerSecurable` both call it, so the result does not depend on the decorator order.
 * @param {object} target - Controller class.
 * @returns {void}
 */
export function ApiControllerApplyForbiddenResponse(target: object): void {
	const isSecurable: boolean = Boolean(Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, target));
	const properties: IApiControllerProperties<IApiBaseEntity> | undefined = Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY, target) as IApiControllerProperties<IApiBaseEntity> | undefined;

	if (!isSecurable || !properties?.authorization || typeof target !== "function") {
		return;
	}

	const decorator: MethodDecorator = ApiForbiddenResponse({ description: "Forbidden", type: DtoGenerateException(HttpStatus.FORBIDDEN) });

	for (const [methodName, descriptor] of collectRouteMethodDescriptors(target.prototype as object)) {
		const handler: object = descriptor.value as object;

		// Swagger joins the descriptions of a status declared twice, so declare it once
		if (Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_FORBIDDEN_RESPONSE_METADATA_KEY, handler) === true) {
			continue;
		}

		decorator(target.prototype as object, methodName, descriptor);
		Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_FORBIDDEN_RESPONSE_METADATA_KEY, true, handler);
	}
}

/**
 * Collects the `ApiMethod` route methods of a prototype and its ancestors, the closest definition of each name first.
 * @param {object} prototype - Prototype to start from.
 * @returns {Map<string, PropertyDescriptor>} Route method descriptors keyed by method name.
 */
function collectRouteMethodDescriptors(prototype: object): Map<string, PropertyDescriptor> {
	const descriptors: Map<string, PropertyDescriptor> = new Map<string, PropertyDescriptor>();
	const seenNames: Set<string> = new Set<string>();

	for (let current: null | object = prototype; current && current !== Object.prototype; current = Object.getPrototypeOf(current) as null | object) {
		for (const methodName of Object.getOwnPropertyNames(current)) {
			if (methodName === "constructor" || seenNames.has(methodName)) {
				continue;
			}

			seenNames.add(methodName);
			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(current, methodName);

			if (typeof descriptor?.value === "function" && Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, descriptor.value as object) !== undefined) {
				descriptors.set(methodName, descriptor);
			}
		}
	}

	return descriptors;
}
