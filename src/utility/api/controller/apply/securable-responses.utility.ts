import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties, IApiRouteMetadata } from "@interface/decorator/api";

import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { EApiRouteType } from "@enum/decorator/api";
import { HttpStatus } from "@nestjs/common";
import { ApiForbiddenResponse, ApiNotFoundResponse } from "@nestjs/swagger";
import { DtoGenerateException } from "@utility/dto/generate/exception.utility";

type TRouteHandler = (...methodArguments: Array<unknown>) => unknown;

/**
 * Declares the statuses a securable controller with an authorization block adds to its routes.
 * The authorization guard runs on each `ApiMethod` route and refuses denied requests with `403`, on generated and custom routes alike.
 * A policy scope also applies to the row a generated CREATE reads back after it wrote it, so a body outside the scope answers `404`. The scope is only known per request, so every generated CREATE of the controller declares it.
 * `@ApiController` and `@ApiControllerSecurable` both call it, so the result does not depend on the decorator order.
 * Swagger keeps responses on the handler function, so an inherited route gets its own handler on this class and the handler it inherits, which sibling controllers share, stays untouched.
 * @param {{ prototype: object }} target - Controller class, which is the wrapper `@ApiController` returns once it ran.
 * @param {object} target.prototype - Prototype of the controller class.
 * @returns {void}
 */
export function ApiControllerApplySecurableResponses(target: { prototype: object }): void {
	const isSecurable: boolean = Boolean(Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, target));
	const properties: IApiControllerProperties<IApiBaseEntity> | undefined = Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY, target) as IApiControllerProperties<IApiBaseEntity> | undefined;

	if (!isSecurable || !properties?.authorization) {
		return;
	}

	const forbiddenDecorator: MethodDecorator = ApiForbiddenResponse({ description: "Forbidden", type: DtoGenerateException(HttpStatus.FORBIDDEN) });
	const notFoundDecorator: MethodDecorator = ApiNotFoundResponse({ description: "Not Found", type: DtoGenerateException(HttpStatus.NOT_FOUND) });

	for (const [methodName, { descriptor, handler, owner }] of collectRouteMethodDescriptors(target.prototype)) {
		const routeMetadata: IApiRouteMetadata<IApiBaseEntity> = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, handler) as IApiRouteMetadata<IApiBaseEntity>;
		// Swagger joins the descriptions of a status declared twice, so declare each one once
		const hasForbidden: boolean = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_FORBIDDEN_RESPONSE_METADATA_KEY, handler) === true;
		const hasScopedNotFound: boolean = isGeneratedCreate(routeMetadata, handler) && !declaresNotFound(routeMetadata);

		if (hasForbidden && !hasScopedNotFound) {
			continue;
		}

		const own: { descriptor: PropertyDescriptor; handler: TRouteHandler } = owner === target.prototype ? { descriptor, handler } : defineOwnRouteMethod(target.prototype, methodName, descriptor, handler);

		if (!hasForbidden) {
			forbiddenDecorator(target.prototype, methodName, own.descriptor);
			Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_FORBIDDEN_RESPONSE_METADATA_KEY, true, own.handler);
		}

		if (hasScopedNotFound) {
			notFoundDecorator(target.prototype, methodName, own.descriptor);
			Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, { ...routeMetadata, response: { ...routeMetadata.response, errors: { ...routeMetadata.response?.errors, hasNotFound: true } } }, own.handler);
		}
	}
}

/**
 * Collects the `ApiMethod` route methods of a prototype and its ancestors, the closest definition of each name first.
 * @param {object} prototype - Prototype to start from.
 * @returns {Map<string, { descriptor: PropertyDescriptor; handler: TRouteHandler; owner: object }>} Route method descriptors, handlers, and the prototypes that own them, keyed by method name.
 */
function collectRouteMethodDescriptors(prototype: object): Map<string, { descriptor: PropertyDescriptor; handler: TRouteHandler; owner: object }> {
	const descriptors: Map<string, { descriptor: PropertyDescriptor; handler: TRouteHandler; owner: object }> = new Map<string, { descriptor: PropertyDescriptor; handler: TRouteHandler; owner: object }>();
	const seenNames: Set<string> = new Set<string>();

	for (let current: null | object = prototype; current && current !== Object.prototype; current = Reflect.getPrototypeOf(current)) {
		for (const methodName of Object.getOwnPropertyNames(current)) {
			if (methodName === "constructor" || seenNames.has(methodName)) {
				continue;
			}

			seenNames.add(methodName);
			const descriptor: PropertyDescriptor | undefined = Reflect.getOwnPropertyDescriptor(current, methodName);
			const handler: unknown = descriptor?.value;

			if (descriptor && isRouteHandler(handler) && Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, handler) !== undefined) {
				descriptors.set(methodName, { descriptor, handler, owner: current });
			}
		}
	}

	return descriptors;
}

/**
 * Checks whether the route already declares `404`, from a response flag or a status it documents itself.
 * @param {IApiRouteMetadata<IApiBaseEntity>} routeMetadata - Route metadata.
 * @returns {boolean} Whether `404` is declared.
 */
function declaresNotFound(routeMetadata: IApiRouteMetadata<IApiBaseEntity>): boolean {
	return !!routeMetadata.response?.errors?.hasNotFound || (routeMetadata.documentation?.response?.statuses ?? []).some((response: { status: unknown }): boolean => response.status === HttpStatus.NOT_FOUND);
}

/**
 * Defines a route method on the controller prototype that calls the inherited one and carries a copy of its metadata.
 * @param {object} controllerPrototype - Prototype of the controller class.
 * @param {string} methodName - Route method name.
 * @param {PropertyDescriptor} inherited - Descriptor of the inherited route method.
 * @param {TRouteHandler} inheritedHandler - The inherited route method.
 * @returns {{ descriptor: PropertyDescriptor; handler: TRouteHandler }} Descriptor of the method defined on the controller prototype, and the method.
 */
function defineOwnRouteMethod(controllerPrototype: object, methodName: string, inherited: PropertyDescriptor, inheritedHandler: TRouteHandler): { descriptor: PropertyDescriptor; handler: TRouteHandler } {
	const ownMethod: TRouteHandler = Object.defineProperty(
		function (this: unknown, ...methodArguments: Array<unknown>): unknown {
			return inheritedHandler.apply(this, methodArguments);
		},
		"name",
		{ value: inheritedHandler.name },
	);

	// Decorators write new metadata objects instead of changing the copied ones
	for (const metadataKey of Reflect.getOwnMetadataKeys(inheritedHandler)) {
		Reflect.defineMetadata(metadataKey, Reflect.getOwnMetadata(metadataKey, inheritedHandler), ownMethod);
	}

	const descriptor: PropertyDescriptor = { ...inherited, value: ownMethod };
	Object.defineProperty(controllerPrototype, methodName, descriptor);

	return { descriptor, handler: ownMethod };
}

/**
 * Checks whether the route is a generated CREATE. A custom route may name the CREATE type too, but it never reads the row back.
 * @param {IApiRouteMetadata<IApiBaseEntity>} routeMetadata - Route metadata.
 * @param {TRouteHandler} handler - Route method.
 * @returns {boolean} Whether the route is a generated CREATE.
 */
function isGeneratedCreate(routeMetadata: IApiRouteMetadata<IApiBaseEntity>, handler: TRouteHandler): boolean {
	return routeMetadata.route.type === EApiRouteType.CREATE && Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_RUNTIME_PROPERTIES_METADATA_KEY, handler) === undefined;
}

/**
 * Narrows a property value to a callable route method.
 * @param {unknown} value - Property value.
 * @returns {boolean} Whether the value is a function.
 */
function isRouteHandler(value: unknown): value is TRouteHandler {
	return typeof value === "function";
}
