/**
 * An exact decimal number an IAM Numeric operator compares.
 */
export interface IApiAuthorizationIamDecimal {
	// Digits after the decimal point; the last of them is never `0`.
	scale: number;
	// The value times ten to the power of the scale.
	unscaled: bigint;
}
