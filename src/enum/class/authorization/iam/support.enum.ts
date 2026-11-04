/**
 * Whether the IAM policy grammar takes a feature: a context key as a condition key, or a variable in a condition value or a `Resource` pattern.
 */
export enum EApiAuthorizationIamSupport {
	// The grammar takes it and the engine enforces it.
	ACCEPTED = "accepted",
	// The grammar refuses it for good, such as a client-controlled variable that would let a client choose its own grant.
	NOT_ALLOWED = "not-allowed",
	// The grammar will take it once the engine can enforce it; until then a document that uses it fails validation.
	NOT_SUPPORTED_YET = "not-supported-yet",
}
