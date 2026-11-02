import { PROPERTY_DATE_DECORATOR_API_CONSTANT } from "@constant/decorator/api/property-date.constant";
import { IsCalendarDateTime } from "@utility/is/calendar-date-time.utility";

const CALENDAR_DATE_PATTERN: RegExp = /^(\d{4})-\d{2}-\d{2}$/u;

/**
 * Checks whether a value is calendar text in the `YYYY-MM-DD` form of a `date` column, naming a day that exists in a year from 0001 to 9999.
 * The day is checked in UTC, so the check does not depend on the process time zone.
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

	const year: number = Number(match[1]);

	return year >= PROPERTY_DATE_DECORATOR_API_CONSTANT.MINIMUM_YEAR && year <= PROPERTY_DATE_DECORATOR_API_CONSTANT.MAXIMUM_YEAR && IsCalendarDateTime(value);
}
