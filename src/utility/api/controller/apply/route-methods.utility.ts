import type { TApiControllerRouteHandler } from "@type/utility/api/controller";

import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";

// The inherited route method each copy on a controller prototype calls
const inheritedRouteMethods: WeakMap<TApiControllerRouteHandler, TApiControllerRouteHandler> = new WeakMap<TApiControllerRouteHandler, TApiControllerRouteHandler>();

/**
 * Collects the `ApiMethod` route methods of a prototype and its ancestors, the closest definition of each name first.
 * @param {object} prototype - Prototype to start from.
 * @returns {Map<string, { descriptor: PropertyDescriptor; handler: TApiControllerRouteHandler; owner: object }>} Route method descriptors, handlers, and the prototypes that own them, keyed by method name.
 */
export function ApiControllerCollectRouteMethods(prototype: object): Map<string, { descriptor: PropertyDescriptor; handler: TApiControllerRouteHandler; owner: object }> {
	const descriptors: Map<string, { descriptor: PropertyDescriptor; handler: TApiControllerRouteHandler; owner: object }> = new Map<string, { descriptor: PropertyDescriptor; handler: TApiControllerRouteHandler; owner: object }>();
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
 * Returns the inherited route method a copy from `ApiControllerGetOwnRouteMethod` calls, through every copy, so a check on the inherited method sees through the copies.
 * @param {unknown} method - A method of a controller prototype.
 * @returns {unknown} The method the copies call, or the method itself when it is no copy.
 */
export function ApiControllerGetInheritedRouteMethod(method: unknown): unknown {
	let current: unknown = method;

	while (isRouteHandler(current) && inheritedRouteMethods.has(current)) {
		current = inheritedRouteMethods.get(current);
	}

	return current;
}

/**
 * Returns the route method a class can declare responses on, without touching the handler its siblings share.
 * Swagger keeps responses on the handler function, so an inherited route gets a method on the controller prototype that calls the inherited one and carries a copy of its metadata.
 * @param {object} controllerPrototype - Prototype of the controller class.
 * @param {string} methodName - Route method name.
 * @param {{ descriptor: PropertyDescriptor; handler: TApiControllerRouteHandler; owner: object }} route - Route method as `ApiControllerCollectRouteMethods` found it.
 * @param {PropertyDescriptor} route.descriptor - Descriptor of the route method.
 * @param {TApiControllerRouteHandler} route.handler - The route method.
 * @param {object} route.owner - Prototype that owns the route method.
 * @returns {{ descriptor: PropertyDescriptor; handler: TApiControllerRouteHandler }} Descriptor of the method on the controller prototype, and the method.
 */
export function ApiControllerGetOwnRouteMethod(controllerPrototype: object, methodName: string, route: { descriptor: PropertyDescriptor; handler: TApiControllerRouteHandler; owner: object }): { descriptor: PropertyDescriptor; handler: TApiControllerRouteHandler } {
	if (route.owner === controllerPrototype) {
		return { descriptor: route.descriptor, handler: route.handler };
	}

	const inheritedHandler: TApiControllerRouteHandler = route.handler;

	const ownMethod: TApiControllerRouteHandler = Object.defineProperty(
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

	inheritedRouteMethods.set(ownMethod, inheritedHandler);
	const descriptor: PropertyDescriptor = { ...route.descriptor, value: ownMethod };
	Object.defineProperty(controllerPrototype, methodName, descriptor);

	return { descriptor, handler: ownMethod };
}

/**
 * Narrows a property value to a callable route method.
 * @param {unknown} value - Property value.
 * @returns {boolean} Whether the value is a function.
 */
function isRouteHandler(value: unknown): value is TApiControllerRouteHandler {
	return typeof value === "function";
}
