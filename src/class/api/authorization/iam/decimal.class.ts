import type { IApiAuthorizationIamDecimal } from "@interface/class/api/authorization";

// Decimal text a Numeric operator reads.
const IAM_DECIMAL_PATTERN: RegExp = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

// Digits of decimal text a comparison reads at most, so a client cannot make it scale a huge number.
const IAM_DECIMAL_MAX_DIGITS: number = 1000;

// Significant digits a double compares exactly.
const IAM_DECIMAL_MAX_DOUBLE_DIGITS: number = 15;

// The base of a decimal.
const IAM_DECIMAL_BASE: bigint = 10n;

const IAM_DECIMAL_ZERO: bigint = 0n;

const IAM_DECIMAL_ONE: bigint = 1n;

/**
 * Exact decimal numbers for the IAM Numeric operators. A value is an unscaled BigInt and a count of fraction digits,
 * and a comparison scales both sides to one count. A literal is never read through a JavaScript number, so two integers
 * past 2^53, or two decimals past the precision of a double, stay apart.
 */
export class ApiAuthorizationIamDecimal {
	/**
	 * Rounds a value up to an integer.
	 * @param {IApiAuthorizationIamDecimal} value - Value.
	 * @returns {bigint} The smallest integer that is not below the value.
	 */
	public static ceil(value: IApiAuthorizationIamDecimal): bigint {
		const floor: bigint = ApiAuthorizationIamDecimal.floor(value);

		return value.scale === 0 ? floor : floor + IAM_DECIMAL_ONE;
	}

	/**
	 * Compares two values exactly.
	 * @param {IApiAuthorizationIamDecimal} left - Left value.
	 * @param {IApiAuthorizationIamDecimal} right - Right value.
	 * @returns {number} -1, 0 or 1 as the left value is below, equal to or above the right one.
	 */
	public static compare(left: IApiAuthorizationIamDecimal, right: IApiAuthorizationIamDecimal): number {
		const scale: number = Math.max(left.scale, right.scale);
		const scaledLeft: bigint = left.unscaled * IAM_DECIMAL_BASE ** BigInt(scale - left.scale);
		const scaledRight: bigint = right.unscaled * IAM_DECIMAL_BASE ** BigInt(scale - right.scale);

		if (scaledLeft === scaledRight) {
			return 0;
		}

		return scaledLeft < scaledRight ? -1 : 1;
	}

	/**
	 * Counts the digits before the decimal point; a value below one counts its one `0`.
	 * @param {IApiAuthorizationIamDecimal} value - Value.
	 * @returns {number} Digits of the integer part.
	 */
	public static countIntegerDigits(value: IApiAuthorizationIamDecimal): number {
		return Math.max(ApiAuthorizationIamDecimal.readDigits(value).length - value.scale, 1);
	}

	/**
	 * Counts the significant digits: every digit between the first and the last that is not `0`.
	 * @param {IApiAuthorizationIamDecimal} value - Value.
	 * @returns {number} Significant digits; zero counts one.
	 */
	public static countSignificantDigits(value: IApiAuthorizationIamDecimal): number {
		return Math.max(ApiAuthorizationIamDecimal.dropTrailingZeros(ApiAuthorizationIamDecimal.readDigits(value)).length, 1);
	}

	/**
	 * Rounds a value down to an integer.
	 * @param {IApiAuthorizationIamDecimal} value - Value.
	 * @returns {bigint} The largest integer that is not above the value.
	 */
	public static floor(value: IApiAuthorizationIamDecimal): bigint {
		if (value.scale === 0) {
			return value.unscaled;
		}

		const divisor: bigint = IAM_DECIMAL_BASE ** BigInt(value.scale);
		const quotient: bigint = value.unscaled / divisor;

		return value.unscaled < IAM_DECIMAL_ZERO ? quotient - IAM_DECIMAL_ONE : quotient;
	}

	/**
	 * Tells whether a value has no fraction.
	 * @param {IApiAuthorizationIamDecimal} value - Value.
	 * @returns {boolean} Whether the value is an integer.
	 */
	public static isInteger(value: IApiAuthorizationIamDecimal): boolean {
		return value.scale === 0;
	}

	/**
	 * Reads a value a column or a context holds: decimal text without an exponent, a finite number through its shortest
	 * text, or a BigInt.
	 * @param {unknown} value - Value to read.
	 * @returns {IApiAuthorizationIamDecimal | undefined} The decimal, or undefined when the value is none.
	 */
	public static parse(value: unknown): IApiAuthorizationIamDecimal | undefined {
		if (typeof value === "bigint") {
			return { scale: 0, unscaled: value };
		}

		if (typeof value === "number") {
			return Number.isFinite(value) ? ApiAuthorizationIamDecimal.parseNumber(value) : undefined;
		}

		return typeof value === "string" ? ApiAuthorizationIamDecimal.parseText(value) : undefined;
	}

	/**
	 * Reads a value a document or a request gives: as `parse`, but a number only when it names one value exactly, that
	 * is when it is a safe integer or has at most 15 significant digits. Any other number has lost digits already.
	 * @param {unknown} value - Value to read.
	 * @returns {IApiAuthorizationIamDecimal | undefined} The decimal, or undefined when the value is none or not exact.
	 */
	public static parseOperand(value: unknown): IApiAuthorizationIamDecimal | undefined {
		const decimal: IApiAuthorizationIamDecimal | undefined = ApiAuthorizationIamDecimal.parse(value);

		if (decimal && typeof value === "number" && !Number.isSafeInteger(value) && ApiAuthorizationIamDecimal.countSignificantDigits(decimal) > IAM_DECIMAL_MAX_DOUBLE_DIGITS) {
			return undefined;
		}

		return decimal;
	}

	/**
	 * Writes a value as canonical decimal text.
	 * @param {IApiAuthorizationIamDecimal} value - Value.
	 * @returns {string} Text without an exponent, a trailing fraction zero or a negative zero.
	 */
	public static toText(value: IApiAuthorizationIamDecimal): string {
		const digits: string = ApiAuthorizationIamDecimal.readDigits(value).padStart(value.scale + 1, "0");
		const integer: string = digits.slice(0, digits.length - value.scale);
		const fraction: string = digits.slice(digits.length - value.scale);

		const sign: string = value.unscaled < IAM_DECIMAL_ZERO ? "-" : "";

		return fraction.length > 0 ? `${sign}${integer}.${fraction}` : `${sign}${integer}`;
	}

	/**
	 * Drops the zeros that end a run of digits, walking back from its end in time linear in the digits.
	 * @param {string} digits - Digits.
	 * @returns {string} The digits without their trailing zeros.
	 */
	private static dropTrailingZeros(digits: string): string {
		let end: number = digits.length;

		while (end > 0 && digits[end - 1] === "0") {
			end--;
		}

		return digits.slice(0, end);
	}

	/**
	 * Reads a finite number through its shortest exponent form, so `1.5e-7` gives the digits JavaScript prints for it.
	 * @param {number} value - Finite number.
	 * @returns {IApiAuthorizationIamDecimal} The decimal.
	 */
	private static parseNumber(value: number): IApiAuthorizationIamDecimal {
		const [mantissa = "0", exponent = "0"]: Array<string> = Math.abs(value).toExponential().split("e");
		const digits: string = mantissa.replace(".", "");
		const scale: number = digits.length - 1 - Number(exponent);
		const magnitude: IApiAuthorizationIamDecimal = scale < 0 ? { scale: 0, unscaled: BigInt(digits) * IAM_DECIMAL_BASE ** BigInt(-scale) } : ApiAuthorizationIamDecimal.trim(BigInt(digits), scale);

		return { scale: magnitude.scale, unscaled: value < 0 ? -magnitude.unscaled : magnitude.unscaled };
	}

	/**
	 * Reads decimal text.
	 * @param {string} text - Text to read.
	 * @returns {IApiAuthorizationIamDecimal | undefined} The decimal, or undefined when the text is no decimal or holds too many digits.
	 */
	private static parseText(text: string): IApiAuthorizationIamDecimal | undefined {
		if (text.length > IAM_DECIMAL_MAX_DIGITS + "-.".length || !IAM_DECIMAL_PATTERN.test(text)) {
			return undefined;
		}

		const isNegative: boolean = text.startsWith("-");
		const [integer = "0", fraction = ""]: Array<string> = (isNegative ? text.slice(1) : text).split(".");

		if (integer.length + fraction.length > IAM_DECIMAL_MAX_DIGITS) {
			return undefined;
		}

		const trimmedFraction: string = ApiAuthorizationIamDecimal.dropTrailingZeros(fraction);
		const unscaled: bigint = BigInt(`${integer}${trimmedFraction}`);

		return { scale: trimmedFraction.length, unscaled: isNegative ? -unscaled : unscaled };
	}

	/**
	 * Writes the digits of the unscaled value without its sign.
	 * @param {IApiAuthorizationIamDecimal} value - Value.
	 * @returns {string} Digits.
	 */
	private static readDigits(value: IApiAuthorizationIamDecimal): string {
		return (value.unscaled < IAM_DECIMAL_ZERO ? -value.unscaled : value.unscaled).toString();
	}

	/**
	 * Drops the trailing fraction zeros of a non-negative value, so equal values share one form.
	 * @param {bigint} unscaled - Unscaled value.
	 * @param {number} scale - Fraction digits.
	 * @returns {IApiAuthorizationIamDecimal} The canonical value.
	 */
	private static trim(unscaled: bigint, scale: number): IApiAuthorizationIamDecimal {
		let trimmedUnscaled: bigint = unscaled;
		let trimmedScale: number = scale;

		while (trimmedScale > 0 && trimmedUnscaled % IAM_DECIMAL_BASE === IAM_DECIMAL_ZERO) {
			trimmedUnscaled /= IAM_DECIMAL_BASE;
			trimmedScale--;
		}

		return { scale: trimmedScale, unscaled: trimmedUnscaled };
	}
}
