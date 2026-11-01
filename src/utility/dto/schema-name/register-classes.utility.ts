import type { Type } from "@nestjs/common";

import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { DtoSchemaNameRegister } from "@utility/dto/schema-name/register.utility";
import { GetRegisteredAutoDtoChildren } from "@utility/register-auto-dto-child.utility";

const BUILT_IN_SCHEMA_TYPES: ReadonlySet<unknown> = new Set<unknown>([Array, BigInt, Boolean, Date, Function, Number, Object, String, Symbol]);

/**
 * Registers a route DTO and every class that its OpenAPI schema reaches at any depth (generated DTOs, hand-written DTOs and plain Swagger classes)
 * under its component name, so two different classes with one name fail at startup instead of sharing one component.
 * @param {Type<unknown>} dto - Route DTO class.
 * @param {string} origin - Where the route DTO comes from, from `DtoSchemaNameGetRouteOrigin`.
 * @returns {void}
 * @throws {Error} When a reached class has the name of a different class from another origin.
 */
export function DtoSchemaNameRegisterClasses(dto: Type<unknown>, origin: string): void {
	const visited: Set<Type<unknown>> = new Set<Type<unknown>>();
	const pending: Array<{ dto: Type<unknown>; origin: string }> = [{ dto, origin }];

	// The array iterator also visits the classes pushed while walking.
	for (const current of pending) {
		if (visited.has(current.dto)) {
			continue;
		}

		visited.add(current.dto);
		DtoSchemaNameRegister(current.dto, current.dto.name, current.origin);

		const prototype: object = current.dto.prototype as object;
		const propertyKeys: Array<string> = (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES_ARRAY, prototype) as Array<string> | undefined) ?? [];

		for (const propertyKey of propertyKeys) {
			const propertyName: string = propertyKey.startsWith(":") ? propertyKey.slice(1) : propertyKey;
			const options: { type?: unknown } | undefined = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, prototype, propertyName) as { type?: unknown } | undefined;

			for (const nested of collectSchemaClasses(options?.type)) {
				pending.push({ dto: nested, origin: `property ${propertyName} in ${current.dto.name}` });
			}
		}

		const extraModels: Array<unknown> = (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.EXTRA_MODELS, current.dto) as Array<unknown> | undefined) ?? [];

		for (const nested of [...(GetRegisteredAutoDtoChildren(prototype) ?? []), ...extraModels.flatMap((model: unknown): Array<Type<unknown>> => collectSchemaClasses(model))]) {
			pending.push({ dto: nested, origin: `a nested model of ${current.dto.name}` });
		}
	}
}

/**
 * Resolves the classes that a Swagger property `type` refers to: a class, a lazy `() => Class` function, or an array of either.
 * @param {unknown} type - Swagger property `type`.
 * @returns {Array<Type<unknown>>} The referred classes, without built-in types.
 */
function collectSchemaClasses(type: unknown): Array<Type<unknown>> {
	if (Array.isArray(type)) {
		return type.flatMap((item: unknown): Array<Type<unknown>> => collectSchemaClasses(item));
	}

	if (typeof type !== "function" || BUILT_IN_SCHEMA_TYPES.has(type)) {
		return [];
	}

	// A lazy type function is an arrow function, which has no prototype, while a class always has one.
	if (!(type as { prototype?: unknown }).prototype) {
		return collectSchemaClasses((type as () => unknown)());
	}

	return [type as Type<unknown>];
}
