import { ApiPropertyGetTargetClassName } from "@utility/api/property-get-target-class-name.utility";

/**
 * Checks the array options of an `@ApiProperty*` decorator. The types require them on a request array, but JavaScript or `any` can leave one out
 * or pass any value, and `Number(process.env.X)` with X unset is NaN; a size bound like that would then reject every request value.
 * @param {object} properties - Array options of the decorator.
 * @param {boolean} [properties.isArray] - Whether the property is an array.
 * @param {boolean} [properties.isResponse] - Whether the property is response-only; such an array may leave its bounds out.
 * @param {boolean} [properties.isUniqueItems] - Whether the items must be unique.
 * @param {number} [properties.maxItems] - Largest item count.
 * @param {number} [properties.minItems] - Smallest item count.
 * @param {object} target - Decorated DTO prototype, or the class of a static property, named in the error.
 * @param {string | symbol} propertyKey - Decorated property key, named in the error.
 * @returns {Array<string>} One message per problem; empty when the options are valid.
 */
export function ApiPropertyGetArrayOptionsErrors(properties: { isArray?: boolean; isResponse?: boolean; isUniqueItems?: boolean; maxItems?: number; minItems?: number }, target: object, propertyKey: string | symbol): Array<string> {
	const { isArray, isResponse, isUniqueItems, maxItems, minItems }: { isArray?: boolean; isResponse?: boolean; isUniqueItems?: boolean; maxItems?: number; minItems?: number } = properties;

	const propertyName: string = `'${ApiPropertyGetTargetClassName(target)}.${String(propertyKey)}'`;

	// Anything but `true` skips the checks below, while a truthy value still builds an array property.
	if (isArray !== undefined && typeof isArray !== "boolean") {
		return [`Property ${propertyName}: 'isArray' must be a boolean`];
	}

	if (isArray !== true) {
		return [];
	}

	const errors: Array<string> = [];

	if (isResponse !== true) {
		const missingBounds: Array<string> = Object.entries({ isUniqueItems, maxItems, minItems })
			.filter(([, bound]: [string, boolean | number | undefined]): boolean => bound === undefined)
			.map(([name]: [string, boolean | number | undefined]): string => `'${name}'`);

		if (missingBounds.length > 0) {
			errors.push(`Request array property ${propertyName} must declare ${missingBounds.join(", ")}, or be marked 'isResponse: true' if it is response-only`);
		}
	}

	for (const [name, bound] of Object.entries({ maxItems, minItems })) {
		if (bound !== undefined && !Number.isInteger(bound)) {
			errors.push(`Property ${propertyName}: '${name}' must be a non-negative integer`);
		}
	}

	if (isUniqueItems !== undefined && typeof isUniqueItems !== "boolean") {
		errors.push(`Property ${propertyName}: 'isUniqueItems' must be a boolean`);
	}

	if (minItems !== undefined && maxItems !== undefined && minItems > maxItems) {
		errors.push(`Property ${propertyName}: 'minItems' is greater than 'maxItems'`);
	}

	if (minItems !== undefined && minItems < 0) {
		errors.push(`Property ${propertyName}: 'minItems' is less than 0`);
	}

	if (maxItems !== undefined && maxItems < 0) {
		errors.push(`Property ${propertyName}: 'maxItems' is less than 0`);
	}

	if (isUniqueItems && maxItems !== undefined && maxItems <= 1) {
		errors.push(`Property ${propertyName}: 'uniqueItems' is true but 'maxItems' is less than or equal to 1`);
	}

	return errors;
}
