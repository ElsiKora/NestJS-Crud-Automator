import { getMetadataStorage } from "class-validator";

const DECLARED_PROPERTY_NAMES_BY_TYPE: WeakMap<object, ReadonlySet<string>> = new WeakMap<object, ReadonlySet<string>>();

/**
 * Resolves and caches the complete inherited validation-property inventory of a DTO instance, matching ValidationPipe whitelist semantics.
 * @param {object} value - Candidate DTO instance.
 * @returns {ReadonlySet<string> | undefined} Declared validation property names, or undefined when the value is not a class instance.
 */
export function DtoGetDeclaredPropertyNames(value: object): ReadonlySet<string> | undefined {
	const constructorCandidate: unknown = Reflect.getPrototypeOf(value)?.constructor;

	if (typeof constructorCandidate !== "function" || constructorCandidate === Object) {
		return undefined;
	}

	const cachedPropertyNames: ReadonlySet<string> | undefined = DECLARED_PROPERTY_NAMES_BY_TYPE.get(constructorCandidate);

	if (cachedPropertyNames) {
		return cachedPropertyNames;
	}

	const declaredPropertyNames: ReadonlySet<string> = new Set(
		getMetadataStorage()
			.getTargetValidationMetadatas(constructorCandidate, "", true, false)
			.map(({ propertyName }: { propertyName: string }): string => propertyName),
	);

	DECLARED_PROPERTY_NAMES_BY_TYPE.set(constructorCandidate, declaredPropertyNames);

	return declaredPropertyNames;
}
