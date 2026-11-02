// A calendar date. Groups: year, month, day.
const DATE_SOURCE: string = String.raw`(\d{4})-(\d{2})-(\d{2})`;

// `T` or a space and a time of day with optional seconds and fraction. Groups: hour, minute, second.
const TIME_SOURCE: string = String.raw`[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?`;

// `Z` or a numeric offset with minutes.
const ZONE_SOURCE: string = String.raw`Z|[+-]\d{2}:?\d{2}`;

/**
 * Patterns of ISO 8601 date and time text as a request carries it, in either letter case.
 * Internal: every request text check reads these, so no check keeps a pattern of its own.
 */
export const DATE_TIME_TEXT_CONSTANT: {
	readonly TEXT_PATTERN: RegExp;
	readonly ZONE_PATTERN: RegExp;
} = Object.freeze({
	// Whole date text: a calendar date, optionally followed by a time of day and then optionally a zone.
	TEXT_PATTERN: new RegExp(`^${DATE_SOURCE}(?:${TIME_SOURCE}(?:${ZONE_SOURCE})?)?$`, "iu"),
	// A trailing zone.
	ZONE_PATTERN: new RegExp(`(?:${ZONE_SOURCE})$`, "iu"),
});
