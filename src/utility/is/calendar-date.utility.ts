const CALENDAR_DATE_PATTERN: RegExp = /^(\d{4})-(\d{2})-(\d{2})$/u;

/**
 * Checks whether a value is calendar text in the `YYYY-MM-DD` form of a `date` column, naming a day that exists.
 * The value is never converted to a JavaScript Date, so the check does not depend on the process time zone.
 * @param {unknown} value - Value to check, usually a raw query string.
 * @returns {boolean} True when the value is `YYYY-MM-DD` text for an existing calendar day.
 */
export function IsCalendarDate(value: unknown): value is string {
	if (typeof value !== "string") {
		return false;
	}

	const match: null | RegExpExecArray = CALENDAR_DATE_PATTERN.exec(value);

	if (!match) {
		return false;
	}

	const [year, month, day]: Array<number> = match.slice(1).map(Number);

	if (year === undefined || month === undefined || day === undefined) {
		return false;
	}

	const date: Date = new Date(0);

	date.setUTCFullYear(year, month - 1, day);

	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
