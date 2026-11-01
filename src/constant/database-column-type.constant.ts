/**
 * Column types as `driver.normalizeType` returns them, grouped by what a stored value means.
 * Internal: every temporal check reads these sets, so no check keeps a list of its own.
 */
export const DATABASE_COLUMN_TYPE_CONSTANT: {
	readonly DATE: ReadonlySet<string>;
	readonly DATE_TIME: ReadonlySet<string>;
	readonly INSTANT: ReadonlySet<string>;
} = Object.freeze({
	// A calendar date without a time of day.
	DATE: new Set<string>(["date"]),
	// A date and a time of day without a zone: the value is local wall-clock text.
	DATE_TIME: new Set<string>(["datetime", "datetime2", "datetimeoffset", "smalldatetime", "timestamp", "timestamp without time zone"]),
	// An exact instant: pg binds it exactly as canonical UTC text, never as a Date.
	INSTANT: new Set<string>(["timestamptz", "timestamp with time zone"]),
});
