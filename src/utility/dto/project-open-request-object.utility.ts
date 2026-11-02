import { DtoGetDeclaredPropertyNames } from "@utility/dto/get/declared-property-names.utility";

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
 * Projects one transformed DTO instance to properties declared by validation metadata.
 * @param {unknown} value - Candidate transformed DTO instance.
 * @returns {void}
 */
function projectObject(value: unknown): void {
	if (typeof value !== "object" || value === null) {
		return;
	}

	const declaredPropertyNames: ReadonlySet<string> | undefined = DtoGetDeclaredPropertyNames(value);

	if (!declaredPropertyNames) {
		return;
	}

	for (const propertyName of Object.keys(value)) {
		if (!declaredPropertyNames.has(propertyName)) {
			Reflect.deleteProperty(value, propertyName);
		}
	}
}
