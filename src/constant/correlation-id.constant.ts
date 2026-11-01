const MAXIMUM_LENGTH: number = 128;
const MINIMUM_LENGTH: number = 1;
// The class is spelled out, because \w also matches non-ASCII letters in other regex dialects that read the published pattern
// eslint-disable-next-line regexp/prefer-w
const PATTERN: RegExp = new RegExp(`^[A-Za-z0-9_.:-]{${String(MINIMUM_LENGTH)},${String(MAXIMUM_LENGTH)}}$`, "u");

export const CORRELATION_ID_CONSTANT: {
	readonly MAXIMUM_LENGTH: number;
	readonly MINIMUM_LENGTH: number;
	readonly PATTERN: RegExp;
} = {
	MAXIMUM_LENGTH,
	MINIMUM_LENGTH,
	PATTERN,
} as const;
