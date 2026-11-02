const CANONICAL_DECIMAL_PATTERN: RegExp = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i;

/**
 * Parses a number written as decimal text, with an optional fraction and exponent.
 * Empty, padded, signed with `+`, hexadecimal, binary and named values such as ``, ` 16 `, `+1`, `0x10`, `.5` or `Infinity` are not canonical, so they cannot pass as a number.
 * @param {string} value - Number text from a query, a body or another string source.
 * @returns {number} The number, or `NaN` when the text is not canonical decimal text.
 */
export function NumberParseCanonicalDecimal(value: string): number {
	return CANONICAL_DECIMAL_PATTERN.test(value) ? Number(value) : Number.NaN;
}
