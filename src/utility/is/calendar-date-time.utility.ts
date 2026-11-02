// The calendar date at the start of ISO 8601 text, with the time of day when one follows: the fields a parsed Date must keep.
const FIELDS_PATTERN: RegExp = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/iu;

/**
 * Checks whether ISO 8601 text names a calendar date, and a time of day, that exist: a Date built from its fields keeps every one of them.
 * JavaScript rolls a day or hour past the end of its month or day over into the next one, so `2026-02-30` would become March 2 and `24:00` the next day; every place the library reads date text checks it here first.
 * The fields are compared as the text writes them, before any offset moves the instant, so a valid date whose instant falls on another UTC day still passes.
 * Only the leading fields are read; the form of the rest, such as the fraction of a second and the zone, and the range of the year, stay with the caller.
 * @param {string} text - Date text, `YYYY-MM-DD` optionally followed by `T` or a space and `HH:mm` or `HH:mm:ss`.
 * @returns {boolean} True when the date and time of day exist in the calendar.
 */
export function IsCalendarDateTime(text: string): boolean {
	const match: null | RegExpExecArray = FIELDS_PATTERN.exec(text);

	if (!match) {
		return false;
	}

	const [year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0]: Array<number> = match.slice(1).map((field: string | undefined): number => Number(field ?? 0));
	// Date.UTC reads years 0 to 99 as 1900 to 1999, so the fields are set on a Date one by one.
	const date: Date = new Date(0);

	date.setUTCFullYear(year, month - 1, day);
	date.setUTCHours(hour, minute, second);

	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && date.getUTCHours() === hour && date.getUTCMinutes() === minute && date.getUTCSeconds() === second;
}
