import type { IDtoSchemaNameRoot } from "@interface/utility/schema-name";
import type { Type } from "@nestjs/common";

import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { DTO_SCHEMA_NAME_CONSTANT } from "@constant/utility/dto/schema-name.constant";
import { ErrorException } from "@utility/error/exception.utility";
import { GetRegisteredAutoDtoChildren } from "@utility/register-auto-dto-child.utility";

const BUILT_IN_SCHEMA_TYPES: ReadonlySet<unknown> = new Set<unknown>([Array, BigInt, Boolean, Date, Function, Number, Object, String, Symbol]);

/**
 * Fails when two different classes that the given schemas reach, at any depth, have one OpenAPI component name,
 * because Swagger keys components by class name and would document one of the classes with the other's schema.
 * Generated DTOs, hand-written DTOs and plain Swagger classes are all walked, and lazy `() => Class` types are resolved now, when every module has loaded.
 * @param {ReadonlyArray<IDtoSchemaNameRoot>} roots - Route schemas of one application.
 * @returns {void}
 * @throws {Error} When two different classes have one name, or a lazy type cannot be resolved.
 */
export function DtoSchemaNameAssertUnique(roots: ReadonlyArray<IDtoSchemaNameRoot>): void {
	const owners: Map<string, string> = new Map<string, string>();
	const visited: Set<Type<unknown>> = new Set<Type<unknown>>();

	for (const root of roots) {
		const pending: Array<{ dto: Type<unknown>; origin: string }> = resolveSchemaClasses(root.type, root.origin).map((dto: Type<unknown>): { dto: Type<unknown>; origin: string } => ({ dto, origin: root.origin }));

		// The array iterator also visits the classes pushed while walking, so one root is walked fully before the next.
		for (const current of pending) {
			if (visited.has(current.dto)) {
				continue;
			}

			visited.add(current.dto);

			// A generated class names the route or parent DTO it was generated from; a hand-written class names where the walk reached it.
			const origin: string = (Reflect.getOwnMetadata(DTO_SCHEMA_NAME_CONSTANT.ORIGIN_METADATA_KEY, current.dto) as string | undefined) ?? current.origin;
			const ownerOrigin: string | undefined = owners.get(current.dto.name);

			if (ownerOrigin !== undefined) {
				throw ErrorException(`OpenAPI component name "${current.dto.name}" belongs to two different classes: ${ownerOrigin}, and ${origin}. Swagger keeps one schema per name, so it would document one of them with the other's schema. Rename the hand-written class, or the controller class, property or variant that the generated name is built from`);
			}

			owners.set(current.dto.name, origin);

			const prototype: object = current.dto.prototype as object;
			const propertyKeys: Array<string> = (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES_ARRAY, prototype) as Array<string> | undefined) ?? [];

			for (const propertyKey of propertyKeys) {
				const propertyName: string = propertyKey.startsWith(":") ? propertyKey.slice(1) : propertyKey;
				const options: { type?: unknown } | undefined = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, prototype, propertyName) as { type?: unknown } | undefined;
				const propertyOrigin: string = `property ${propertyName} in ${current.dto.name}`;

				for (const nested of resolveSchemaClasses(options?.type, propertyOrigin)) {
					pending.push({ dto: nested, origin: propertyOrigin });
				}
			}

			const nestedOrigin: string = `a nested model of ${current.dto.name}`;
			const extraModels: Array<unknown> = (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.EXTRA_MODELS, current.dto) as Array<unknown> | undefined) ?? [];

			for (const nested of [...(GetRegisteredAutoDtoChildren(prototype) ?? []), ...extraModels.flatMap((model: unknown): Array<Type<unknown>> => resolveSchemaClasses(model, nestedOrigin))]) {
				pending.push({ dto: nested, origin: nestedOrigin });
			}
		}
	}
}

/**
 * Resolves the classes that a Swagger `type` refers to: a class, a lazy `() => Class` function, or an array of either.
 * @param {unknown} type - Swagger `type`.
 * @param {string} origin - Where the type is used, for the error about a lazy type that cannot be resolved.
 * @returns {Array<Type<unknown>>} The referred classes, without built-in types.
 * @throws {Error} When a lazy type throws or returns nothing.
 */
function resolveSchemaClasses(type: unknown, origin: string): Array<Type<unknown>> {
	if (Array.isArray(type)) {
		return type.flatMap((item: unknown): Array<Type<unknown>> => resolveSchemaClasses(item, origin));
	}

	if (typeof type !== "function" || BUILT_IN_SCHEMA_TYPES.has(type)) {
		return [];
	}

	// A lazy type function is an arrow function, which has no prototype, while a class always has one.
	if ((type as { prototype?: unknown }).prototype) {
		return [type as Type<unknown>];
	}

	let resolved: unknown;

	try {
		resolved = (type as () => unknown)();
	} catch (error) {
		throw ErrorException(`Cannot resolve the lazy type of ${origin}: ${error instanceof Error ? error.message : String(error)}. Swagger resolves it the same way when it builds the document, so the class must be loaded before the application starts`);
	}

	if (resolved === undefined || resolved === null) {
		throw ErrorException(`Cannot resolve the lazy type of ${origin}: it returns ${String(resolved)}, as a circular import does while the module that declares the class has not finished loading. Swagger resolves it the same way when it builds the document, so the class must be loaded before the application starts`);
	}

	return resolveSchemaClasses(resolved, origin);
}
