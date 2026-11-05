// Canonical decimal text of an integer of at most 19 digits: no sign on zero, no leading zeros, no plus sign.
const SIGNED_BIGINT_TEXT_PATTERN: RegExp = /^(?:0|-?[1-9]\d{0,18})$/;
const SIGNED_BIGINT_MAXIMUM: bigint = 9_223_372_036_854_775_807n;
const SIGNED_BIGINT_MINIMUM: bigint = -9_223_372_036_854_775_808n;

/**
 * Tells whether a value is the canonical decimal text of a signed 64-bit integer, the values a `bigint` column holds.
 * A longer or larger text would make PostgreSQL fail the query and the other databases clamp or find no row, so it is refused as a request value instead.
 * @param {unknown} value - Value to check.
 * @returns {boolean} True when the value is canonical decimal text from -9223372036854775808 to 9223372036854775807.
 */
export function IsSignedBigIntText(value: unknown): value is string {
	if (typeof value !== "string" || !SIGNED_BIGINT_TEXT_PATTERN.test(value)) {
		return false;
	}

	const parsed: bigint = BigInt(value);

	return parsed >= SIGNED_BIGINT_MINIMUM && parsed <= SIGNED_BIGINT_MAXIMUM;
}
