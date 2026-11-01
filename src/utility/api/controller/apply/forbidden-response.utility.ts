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
 * Swagger keeps responses on the handler function, so an inherited route gets its own handler on the controller class and the base class handler, which other controllers share, stays untouched.
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
	const controllerPrototype: object = (resolveControllerClass(target) as { prototype: object }).prototype;

	for (const [methodName, { descriptor, owner }] of collectRouteMethodDescriptors(target.prototype as object)) {
		// Swagger joins the descriptions of a status declared twice, so declare it once
		if (Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_FORBIDDEN_RESPONSE_METADATA_KEY, descriptor.value as object) === true) {
			continue;
		}

		const ownDescriptor: PropertyDescriptor = owner === controllerPrototype ? descriptor : defineOwnRouteMethod(controllerPrototype, methodName, descriptor);

		decorator(controllerPrototype, methodName, ownDescriptor);
		Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_FORBIDDEN_RESPONSE_METADATA_KEY, true, ownDescriptor.value as object);
	}
}

/**
 * Collects the `ApiMethod` route methods of a prototype and its ancestors, the closest definition of each name first.
 * @param {object} prototype - Prototype to start from.
 * @returns {Map<string, { descriptor: PropertyDescriptor; owner: object }>} Route method descriptors and the prototypes that own them, keyed by method name.
 */
function collectRouteMethodDescriptors(prototype: object): Map<string, { descriptor: PropertyDescriptor; owner: object }> {
	const descriptors: Map<string, { descriptor: PropertyDescriptor; owner: object }> = new Map<string, { descriptor: PropertyDescriptor; owner: object }>();
	const seenNames: Set<string> = new Set<string>();

	for (let current: null | object = prototype; current && current !== Object.prototype; current = Object.getPrototypeOf(current) as null | object) {
		for (const methodName of Object.getOwnPropertyNames(current)) {
			if (methodName === "constructor" || seenNames.has(methodName)) {
				continue;
			}

			seenNames.add(methodName);
			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(current, methodName);

			if (typeof descriptor?.value === "function" && Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, descriptor.value as object) !== undefined) {
				descriptors.set(methodName, { descriptor, owner: current });
			}
		}
	}

	return descriptors;
}

/**
 * Defines a route method on the controller prototype that calls the inherited one and carries a copy of its metadata.
 * @param {object} controllerPrototype - Prototype of the controller class.
 * @param {string} methodName - Route method name.
 * @param {PropertyDescriptor} inherited - Descriptor of the inherited route method.
 * @returns {PropertyDescriptor} Descriptor of the method defined on the controller prototype.
 */
function defineOwnRouteMethod(controllerPrototype: object, methodName: string, inherited: PropertyDescriptor): PropertyDescriptor {
	const inheritedMethod: (...methodArguments: Array<unknown>) => unknown = inherited.value as (...methodArguments: Array<unknown>) => unknown;

	const ownMethod: (...methodArguments: Array<unknown>) => unknown = Object.defineProperty(
		function (this: unknown, ...methodArguments: Array<unknown>): unknown {
			return inheritedMethod.apply(this, methodArguments);
		},
		"name",
		{ value: inheritedMethod.name },
	);

	// Decorators write new metadata objects instead of changing the copied ones
	for (const metadataKey of Reflect.getOwnMetadataKeys(inheritedMethod)) {
		Reflect.defineMetadata(metadataKey, Reflect.getOwnMetadata(metadataKey, inheritedMethod), ownMethod);
	}

	const descriptor: PropertyDescriptor = { ...inherited, value: ownMethod };
	Object.defineProperty(controllerPrototype, methodName, descriptor);

	return descriptor;
}

/**
 * Resolves the class that `@ApiController` configured, which `@ApiController` wraps once it ran.
 * @param {object} target - Controller class or the wrapper `@ApiController` returns.
 * @returns {object} The class that owns the controller properties.
 */
function resolveControllerClass(target: object): object {
	for (let current: null | object = target; current && current !== Function.prototype; current = Object.getPrototypeOf(current) as null | object) {
		if (Reflect.getOwnMetadata(CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY, current) !== undefined) {
			return current;
		}
	}

	return target;
}
