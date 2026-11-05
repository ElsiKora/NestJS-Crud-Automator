const CANONICAL_INTEGER_PATTERN: RegExp = /^(?:0|-?[1-9]\d*)$/;

/**
 * Parses an integer written in canonical decimal form.
 * A string such as `016`, ` 16`, `0x10`, `16.0`, `1.6e1` or `1e3` is not canonical, so it cannot name the same row as `16`, and `-0` is not canonical, so it cannot name the row of `0`.
 * @param {string} value - Integer text from a path, a query or another string source.
 * @returns {number} The integer, or `NaN` when the text is not a canonical integer.
 */
export function NumberParseCanonicalInteger(value: string): number {
	return CANONICAL_INTEGER_PATTERN.test(value) ? Number(value) : Number.NaN;
}
