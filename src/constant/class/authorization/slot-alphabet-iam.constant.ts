/**
 * The characters a placeholder renders for a column whose database type enforces them, so a glob's literal outside them
 * cannot lie in that placeholder. A column that can hold any text has no alphabet.
 * Internal: the IAM query planner is its only user.
 */
export const AUTHORIZATION_IAM_SLOT_ALPHABET_CONSTANT: {
	readonly BOOLEAN: RegExp;
	readonly DATE: RegExp;
	readonly INTEGER: RegExp;
	readonly UUID: RegExp;
} = Object.freeze({
	// `true` and `false`.
	BOOLEAN: /^[a-z]$/u,
	// The ISO text of an instant or a calendar date.
	DATE: /^[\d+.:TZ-]$/u,
	// The decimal text of an integer.
	INTEGER: /^[\d-]$/u,
	// The canonical text of a UUID, which is how PostgreSQL returns one.
	UUID: /^[\da-f-]$/u,
});
