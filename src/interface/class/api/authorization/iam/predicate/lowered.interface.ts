/**
 * One IAM predicate atom lowered for a dialect: a TypeORM condition on the atom's query path, or nothing when the
 * dialect cannot express the atom exactly, which fails the whole scope closed.
 */
export interface IApiAuthorizationIamPredicateLowered {
	// Whether the dialect expresses the atom exactly.
	isExact: boolean;
	// TypeORM value or find operator for the atom's query path.
	operand?: unknown;
}
