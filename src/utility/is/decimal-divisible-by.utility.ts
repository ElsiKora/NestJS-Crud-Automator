const DECIMAL_BASE: bigint = 10n;
const NO_REMAINDER: bigint = 0n;

/**
 * Checks that a number is a multiple of a divisor in decimal, as the JSON Schema `multipleOf` a client reads means it.
 * Binary floating point cannot divide decimals exactly, so both numbers are compared as the decimal text JavaScript writes for them.
 * @param {unknown} value - Value to check.
 * @param {unknown} divisor - Divisor to check against.
 * @returns {boolean} True when both are finite numbers, the divisor is not zero, and the value is an exact multiple of it.
 */
export function IsDecimalDivisibleBy(value: unknown, divisor: unknown): boolean {
	if (typeof value !== "number" || typeof divisor !== "number" || !Number.isFinite(value) || !Number.isFinite(divisor) || divisor === 0) {
		return false;
	}

	const dividend: { digits: bigint; exponent: number } = readDecimal(value);
	const step: { digits: bigint; exponent: number } = readDecimal(divisor);
	const exponent: number = Math.min(dividend.exponent, step.exponent);

	const scaledDividend: bigint = dividend.digits * DECIMAL_BASE ** BigInt(dividend.exponent - exponent);
	const scaledStep: bigint = step.digits * DECIMAL_BASE ** BigInt(step.exponent - exponent);

	return scaledDividend % scaledStep === NO_REMAINDER;
}

/**
 * Reads a finite number as the integer digits and power of ten of the decimal text JavaScript writes for it.
 * @param {number} value - Finite number.
 * @returns {{ digits: bigint; exponent: number }} The digits and the power of ten they are scaled by.
 */
function readDecimal(value: number): { digits: bigint; exponent: number } {
	const [mantissa = "", scientificExponent = "0"]: Array<string> = String(value).split("e");
	const [integerPart = "", fractionPart = ""]: Array<string> = mantissa.split(".");

	return { digits: BigInt(`${integerPart}${fractionPart}`), exponent: Number(scientificExponent) - fractionPart.length };
}
