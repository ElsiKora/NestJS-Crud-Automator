export const PATH_PARAMETER_FAILURE_CONSTANT: { CONVERSION_MISMATCH_CONSTRAINT: string; MISSING_CONSTRAINT: string; NO_TEXT_CONSTRAINT: string; NOT_CANONICAL_CONSTRAINT: string; UNSTABLE_CONSTRAINT: string } = {
	CONVERSION_MISMATCH_CONSTRAINT: "pathParameterConversionMismatch",
	// The name class-validator gives `@IsDefined`, so a host translates a missing value as its pipe would.
	MISSING_CONSTRAINT: "isDefined",
	NO_TEXT_CONSTRAINT: "pathParameterNoText",
	NOT_CANONICAL_CONSTRAINT: "pathParameterNotCanonical",
	UNSTABLE_CONSTRAINT: "pathParameterUnstable",
} as const;
