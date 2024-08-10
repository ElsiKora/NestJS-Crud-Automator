const MINIMUM_UNIX_TIME: number = 0;
const MAXIMUM_UNIX_TIME: number = 2_147_483_647_000;

export const DATE_CONSTANT: {
	readonly MAXIMUM_UNIX_TIME: number;
	readonly MINIMUM_UNIX_TIME: number;
} = {
	MAXIMUM_UNIX_TIME,
	MINIMUM_UNIX_TIME,
} as const;
