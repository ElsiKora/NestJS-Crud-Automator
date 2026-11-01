/**
 * Writes typed path values as the canonical text that the authorization context sees.
 * @param {object | undefined} parameters - Typed path values.
 * @returns {Record<string, string> | undefined} Path values as canonical text; a value with no text form is left out.
 */
export function AuthorizationSerializeParameters(parameters: object | undefined): Record<string, string> | undefined {
	if (!parameters) {
		return undefined;
	}

	const serialized: Record<string, string> = {};

	for (const [key, value] of Object.entries(parameters)) {
		const text: string | undefined = AuthorizationSerializeValue(value);

		if (text !== undefined) {
			serialized[key] = text;
		}
	}

	return serialized;
}

/**
 * Writes one validated path, resource or condition value as the canonical text that authorization compares.
 * An integer is decimal text, a boolean is `true` or `false`, a date-time is ISO 8601 UTC with milliseconds, and text, such as a lower-case UUID or a `YYYY-MM-DD` day, is kept as given.
 * @param {unknown} value - Typed value.
 * @returns {string | undefined} Canonical text, or undefined for a value with no text form, such as null, an object, or an invalid date.
 */
export function AuthorizationSerializeValue(value: unknown): string | undefined {
	if (typeof value === "string") {
		return value;
	}

	if ((typeof value === "number" && Number.isFinite(value)) || typeof value === "bigint") {
		return value.toString();
	}

	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}

	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value.toISOString();
	}

	return undefined;
}
