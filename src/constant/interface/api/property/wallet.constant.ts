const MINIMUM: number = 10_000_000_000;
const MAXIMUM: number = 999_999_999_999;
const EXAMPLE: number = 18_143_008_867;

export const API_PROPERTY_WALLET_INTERFACE_CONSTANT: {
	readonly EXAMPLE: number;
	readonly MAXIMUM: number;
	readonly MINIMUM: number;
} = {
	EXAMPLE,
	MAXIMUM,
	MINIMUM,
} as const;
