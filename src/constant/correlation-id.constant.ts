const MAXIMUM_LENGTH: number = 128;
const MINIMUM_LENGTH: number = 1;
const PATTERN: RegExp = /^[\w.:-]{1,128}$/u;

export const CORRELATION_ID_CONSTANT: {
	readonly MAXIMUM_LENGTH: number;
	readonly MINIMUM_LENGTH: number;
	readonly PATTERN: RegExp;
} = {
	MAXIMUM_LENGTH,
	MINIMUM_LENGTH,
	PATTERN,
} as const;
