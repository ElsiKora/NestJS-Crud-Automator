/**
 * Patterns of ISO 8601 date and time text as a request carries it.
 * Internal: every request text check reads these, so no check keeps a pattern of its own.
 */
export const DATE_TIME_TEXT_CONSTANT: {
	readonly ZONE_PATTERN: RegExp;
} = Object.freeze({
	// A trailing `Z` or a numeric offset with minutes.
	ZONE_PATTERN: /(?:Z|[+-]\d{2}:?\d{2})$/iu,
});
