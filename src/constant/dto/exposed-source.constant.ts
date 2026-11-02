const MARKER: unique symbol = Symbol("crud-automator:exposed-source");

export const EXPOSED_SOURCE_DTO_CONSTANT: {
	readonly MARKER: typeof MARKER;
} = {
	MARKER,
} as const;
