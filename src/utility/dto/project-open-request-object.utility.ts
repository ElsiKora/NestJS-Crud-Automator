import type { ClassConstructor } from "class-transformer";

import { getMetadataStorage } from "class-validator";

const DECLARED_PROPERTY_NAMES_BY_TYPE: WeakMap<ClassConstructor<unknown>, ReadonlySet<string>> = new WeakMap<ClassConstructor<unknown>, ReadonlySet<string>>();

/**
 * Removes undeclared own properties from an already transformed request DTO or DTO array.
 * Declared property ownership follows class-validator metadata, matching ValidationPipe whitelist semantics.
 * @param {unknown} value - Transformed nested request value.
 * @returns {unknown} The same value after projection to declared DTO properties.
 */
export function DtoProjectOpenRequestObject(value: unknown): unknown {
	if (Array.isArray(value)) {
		for (const item of value) {
			projectObject(item);
		}

		return value;
	}

	projectObject(value);

	return value;
}

/**
 * Resolves and caches the complete inherited validation-property inventory for a DTO type.
 * @param {ClassConstructor<unknown>} constructor - Runtime DTO constructor.
 * @returns {ReadonlySet<string>} Declared validation property names.
 */
function getDeclaredPropertyNames(constructor: ClassConstructor<unknown>): ReadonlySet<string> {
	const cachedPropertyNames: ReadonlySet<string> | undefined = DECLARED_PROPERTY_NAMES_BY_TYPE.get(constructor);

	if (cachedPropertyNames) {
		return cachedPropertyNames;
	}

	const declaredPropertyNames: ReadonlySet<string> = new Set(
		getMetadataStorage()
			.getTargetValidationMetadatas(constructor, "", true, false)
			.map(({ propertyName }: { propertyName: string }): string => propertyName),
	);

	DECLARED_PROPERTY_NAMES_BY_TYPE.set(constructor, declaredPropertyNames);

	return declaredPropertyNames;
}

/**
 * Projects one transformed DTO instance to properties declared by validation metadata.
 * @param {unknown} value - Candidate transformed DTO instance.
 * @returns {void}
 */
function projectObject(value: unknown): void {
	if (typeof value !== "object" || value === null) {
		return;
	}

	const prototype: null | object = Object.getPrototypeOf(value) as null | object;
	const constructorCandidate: unknown = prototype && "constructor" in prototype ? prototype.constructor : undefined;

	if (typeof constructorCandidate !== "function" || constructorCandidate === Object) {
		return;
	}

	const constructor: ClassConstructor<unknown> = constructorCandidate as ClassConstructor<unknown>;
	const declaredPropertyNames: ReadonlySet<string> = getDeclaredPropertyNames(constructor);

	for (const propertyName of Object.keys(value)) {
		if (!declaredPropertyNames.has(propertyName)) {
			Reflect.deleteProperty(value, propertyName);
		}
	}
}
