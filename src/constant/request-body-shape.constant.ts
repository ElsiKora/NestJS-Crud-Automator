export const REQUEST_BODY_SHAPE_CONSTANT: { MAXIMUM_DEPTH: number; MAXIMUM_DEPTH_CONSTRAINT: string; MAXIMUM_KEYS_CONSTRAINT: string; MAXIMUM_OBJECT_KEYS: number; NUL_CHARACTER_CONSTRAINT: string; RESERVED_KEY_CONSTRAINT: string; RESERVED_KEYS: ReadonlySet<string> } = {
	// eslint-disable-next-line @elsikora/typescript/no-magic-numbers
	MAXIMUM_DEPTH: 64,
	MAXIMUM_DEPTH_CONSTRAINT: "requestBodyMaximumDepth",
	MAXIMUM_KEYS_CONSTRAINT: "requestBodyMaximumKeys",
	// eslint-disable-next-line @elsikora/typescript/no-magic-numbers
	MAXIMUM_OBJECT_KEYS: 1000,
	NUL_CHARACTER_CONSTRAINT: "requestBodyNulCharacter",
	RESERVED_KEY_CONSTRAINT: "requestBodyReservedKey",
	RESERVED_KEYS: new Set<string>(["__proto__", "constructor", "hasOwnProperty", "prototype"]),
} as const;
