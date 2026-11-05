export const PATH_PARAMETER_FAILURE_CONSTANT: { CONVERSION_MISMATCH_CONSTRAINT: string; MISSING_CONSTRAINT: string; NO_TEXT_CONSTRAINT: string; NOT_CANONICAL_CONSTRAINT: string; NUL_CHARACTER_CONSTRAINT: string; OUT_OF_RANGE_CONSTRAINT: string; UNSTABLE_CONSTRAINT: string } = {
	CONVERSION_MISMATCH_CONSTRAINT: "pathParameterConversionMismatch",
	// The name class-validator gives `@IsDefined`, so a host translates a missing value as its pipe would.
	MISSING_CONSTRAINT: "isDefined",
	NO_TEXT_CONSTRAINT: "pathParameterNoText",
	NOT_CANONICAL_CONSTRAINT: "pathParameterNotCanonical",
	// A path value holds U+0000, which PostgreSQL text cannot hold and other databases compare unlike IAM.
	NUL_CHARACTER_CONSTRAINT: "pathParameterNulCharacter",
	// A path value of a signed 64-bit integer column is outside that range, which PostgreSQL refuses with an error and other databases match to no row.
	OUT_OF_RANGE_CONSTRAINT: "pathParameterOutOfRange",
	UNSTABLE_CONSTRAINT: "pathParameterUnstable",
} as const;
