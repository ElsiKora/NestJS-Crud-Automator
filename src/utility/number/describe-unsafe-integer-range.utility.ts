import { EApiPropertyNumberType } from "@enum/decorator/api";

/**
 * Describes why an integer NUMBER range cannot be held by a JavaScript number.
 * A bound outside the safe integer range would let two different column values parse to the same number.
 * @param {object} properties - Described number properties.
 * @param {EApiPropertyNumberType} properties.format - Described number format.
 * @param {number} properties.maximum - Described maximum.
 * @param {number} properties.minimum - Described minimum.
 * @returns {string | undefined} Error text naming BIGINT_STRING, or undefined when the range is safe or the format is not INTEGER.
 */
export function NumberDescribeUnsafeIntegerRange(properties: { format: EApiPropertyNumberType; maximum: number; minimum: number }): string | undefined {
	if (properties.format !== EApiPropertyNumberType.INTEGER) {
		return undefined;
	}

	const errors: Array<string> = [];

	if (properties.maximum > Number.MAX_SAFE_INTEGER) {
		errors.push(`'maximum' ${String(properties.maximum)} is greater than Number.MAX_SAFE_INTEGER (${String(Number.MAX_SAFE_INTEGER)})`);
	}

	if (properties.minimum < Number.MIN_SAFE_INTEGER) {
		errors.push(`'minimum' ${String(properties.minimum)} is less than Number.MIN_SAFE_INTEGER (${String(Number.MIN_SAFE_INTEGER)})`);
	}

	if (errors.length === 0) {
		return undefined;
	}

	return `${errors.join("; ")}. An integer NUMBER property cannot hold such values exactly; describe a bigint column as EApiPropertyDescribeType.STRING with format EApiPropertyStringType.BIGINT_STRING`;
}
