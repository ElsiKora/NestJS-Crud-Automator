export const REQUEST_BODY_SHAPE_CONSTANT: { MAXIMUM_DEPTH: number; MAXIMUM_OBJECT_KEYS: number } = {
	// eslint-disable-next-line @elsikora/typescript/no-magic-numbers
	MAXIMUM_DEPTH: 64,
	// eslint-disable-next-line @elsikora/typescript/no-magic-numbers
	MAXIMUM_OBJECT_KEYS: 1000,
} as const;
