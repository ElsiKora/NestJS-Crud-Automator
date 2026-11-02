import { DATE_TIME_TEXT_CONSTANT } from "@constant/date-time-text.constant";

/**
 * Checks whether text is ISO 8601 date text naming a calendar date, and a time of day, that exist: a Date built from its fields keeps every one of them.
 * The whole text must match: `YYYY-MM-DD`, optionally followed by `T` or a space, `HH:mm`, optional seconds and fraction, and an optional `Z` or numeric offset with minutes, in either letter case.
 * JavaScript rolls a day or hour past the end of its month or day over into the next one, so `2026-02-30` would become March 2 and `24:00` the next day; every place the library reads date text checks it here first.
 * The fields are compared as the text writes them, before any offset moves the instant, so a valid date whose instant falls on another UTC day still passes.
 * @param {string} text - Date text.
 * @returns {boolean} True when the text has that form and its date and time of day exist in the calendar.
 */
export function IsCalendarDateTime(text: string): boolean {
	const match: null | RegExpExecArray = DATE_TIME_TEXT_CONSTANT.TEXT_PATTERN.exec(text);

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
