import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IDtoSchemaNameCustomRoute } from "@interface/utility/schema-name";

import { DTO_SCHEMA_NAME_CONSTANT } from "@constant/utility/dto/schema-name.constant";
import { ApiRouteApplyDtoMetadata } from "@utility/api/route/apply-dto-metadata.utility";

/**
 * Gives a decorated controller its own copy of every `@ApiRouteCustom` handler it inherits from a base class or mixin,
 * with the request DTOs generated for the controller's schema prefix instead of the prefix of the class that declares the handler.
 * The copy calls the inherited handler and carries its route, Swagger and runtime metadata without the request DTO entries of the declaring class.
 * @param {new (...arguments_: Array<never>) => unknown} controller - Class decorated with `@ApiController`.
 * @returns {void}
 */
export function ApiRouteRebindInheritedCustom(controller: new (...arguments_: Array<never>) => unknown): void {
	const controllerPrototype: object = controller.prototype as object;
	const seenPropertyNames: Set<string> = new Set<string>(Object.getOwnPropertyNames(controllerPrototype));

	for (let prototype: null | object = Object.getPrototypeOf(controllerPrototype) as null | object; prototype && prototype !== Object.prototype; prototype = Object.getPrototypeOf(prototype) as null | object) {
		for (const propertyName of Object.getOwnPropertyNames(prototype)) {
			if (seenPropertyNames.has(propertyName)) {
				continue;
			}

			seenPropertyNames.add(propertyName);

			const handler: unknown = Object.getOwnPropertyDescriptor(prototype, propertyName)?.value;

			if (!isHandler(handler)) {
				continue;
			}

			const customRoute: IDtoSchemaNameCustomRoute<IApiBaseEntity> | undefined = Reflect.getOwnMetadata(DTO_SCHEMA_NAME_CONSTANT.CUSTOM_ROUTE_METADATA_KEY, handler) as IDtoSchemaNameCustomRoute<IApiBaseEntity> | undefined;

			if (customRoute) {
				rebind(controllerPrototype, propertyName, handler, customRoute);
			}
		}
	}
}

/**
 * Tells a method of a prototype from an accessor value or other property.
 * @param {unknown} value - Property value.
 * @returns {boolean} Whether the value is a function.
 */
function isHandler(value: unknown): value is (...methodArguments: Array<unknown>) => unknown {
	return typeof value === "function";
}

/**
 * Defines the controller's own copy of one inherited custom route handler and applies the request DTO metadata for the controller.
 * @param {object} controllerPrototype - Prototype of the decorated controller.
 * @param {string} propertyName - Handler method name.
 * @param {(...methodArguments: Array<unknown>) => unknown} inheritedHandler - Handler declared by the base class or mixin.
 * @param {IDtoSchemaNameCustomRoute<IApiBaseEntity>} customRoute - Route configuration and the request DTO entries of the declaring class.
 * @returns {void}
 */
function rebind(controllerPrototype: object, propertyName: string, inheritedHandler: (...methodArguments: Array<unknown>) => unknown, customRoute: IDtoSchemaNameCustomRoute<IApiBaseEntity>): void {
	const handler: (...methodArguments: Array<unknown>) => unknown = Object.defineProperty(
		function (this: unknown, ...methodArguments: Array<unknown>): unknown {
			return inheritedHandler.apply(this, methodArguments);
		},
		"name",
		{ value: inheritedHandler.name },
	);

	for (const metadataKey of Reflect.getOwnMetadataKeys(inheritedHandler)) {
		const value: unknown = Reflect.getOwnMetadata(metadataKey, inheritedHandler);
		const inheritedEntries: Array<unknown> | undefined = customRoute.contribution[String(metadataKey)];

		Reflect.defineMetadata(metadataKey, inheritedEntries && Array.isArray(value) ? value.filter((entry: unknown): boolean => !inheritedEntries.includes(entry)) : value, handler);
	}

	const descriptor: PropertyDescriptor = {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		configurable: true,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		enumerable: false,
		value: handler,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		writable: true,
	};

	Object.defineProperty(controllerPrototype, propertyName, descriptor);
	const contribution: Record<string, Array<unknown>> = ApiRouteApplyDtoMetadata(controllerPrototype, propertyName, customRoute.metadata, customRoute.runtimeProperties, descriptor);

	Reflect.defineMetadata(DTO_SCHEMA_NAME_CONSTANT.CUSTOM_ROUTE_METADATA_KEY, { ...customRoute, contribution }, handler);
}
