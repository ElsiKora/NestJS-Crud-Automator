const ZERO_LIST_LENGTH: number = 0;
const ZERO: number = 0;
const ONE: number = 1;
const NEGATIVE_ONE: number = -1;
const FIRST_ARRAY_ELEMENT_INDEX: number = 0;
const MAX_CONVERSION_PERCENTAGE: number = 100;
const MIN_CONVERSION_PERCENTAGE: number = 0;
const PERCENTAGE_MULTIPLIER: number = 100;
const PERCENTAGE_PRECISION: number = 2;
const SORT_ARGUMENT_LESS: number = -1;
const SORT_ARGUMENT_MORE: number = 1;
const MIN_INTEGER: number = -2_147_483_648;
const MAX_INTEGER: number = 2_147_483_647;
const MIN_BIGINT: number = -9_223_372_036_854_775_808;
// eslint-disable-next-line @elsikora/javascript/no-loss-of-precision
const MAX_BIGINT: number = 9_223_372_036_854_775_807;
const MILLISECONDS_IN_SECOND: number = 1000;

export const NUMBER_CONSTANT: {
	readonly FIRST_ARRAY_ELEMENT_INDEX: number;
	readonly MAX_BIGINT: number;
	readonly MAX_CONVERSION_PERCENTAGE: number;
	readonly MAX_INTEGER: number;
	readonly MILLISECONDS_IN_SECOND: number;
	readonly MIN_BIGINT: number;
	readonly MIN_CONVERSION_PERCENTAGE: number;
	readonly MIN_INTEGER: number;
	readonly NEGATIVE_ONE: number;
	readonly ONE: number;
	readonly PERCENTAGE_MULTIPLIER: number;
	readonly PERCENTAGE_PRECISION: number;
	readonly SORT_ARGUMENT_LESS: number;
	readonly SORT_ARGUMENT_MORE: number;
	readonly ZERO: number;
	readonly ZERO_LIST_LENGTH: number;
} = {
	FIRST_ARRAY_ELEMENT_INDEX,
	MAX_BIGINT,
	MAX_CONVERSION_PERCENTAGE,
	MAX_INTEGER,
	MILLISECONDS_IN_SECOND,
	MIN_BIGINT,
	MIN_CONVERSION_PERCENTAGE,
	MIN_INTEGER,
	NEGATIVE_ONE,
	ONE,
	PERCENTAGE_MULTIPLIER,
	PERCENTAGE_PRECISION,
	SORT_ARGUMENT_LESS,
	SORT_ARGUMENT_MORE,
	ZERO,
	ZERO_LIST_LENGTH,
} as const;
