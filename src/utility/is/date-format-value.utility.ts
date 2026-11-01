import { PROPERTY_DATE_DECORATOR_API_CONSTANT } from "@constant/decorator/api/property-date.constant";
import { EApiPropertyDateType } from "@enum/decorator/api/property/date/type.enum";
import { IsCalendarDate } from "@utility/is/calendar-date.utility";

const DATE_TIME_PATTERN: RegExp = new RegExp(PROPERTY_DATE_DECORATOR_API_CONSTANT.PATTERN[EApiPropertyDateType.DATE_TIME], "u");
const HOURS_PER_DAY: number = 24;
const MINUTES_PER_HOUR: number = 60;
const SECONDS_PER_MINUTE: number = 60;
const TIME_PATTERN: RegExp = /^(\d{2}):(\d{2}):(\d{2})$/u;

/**
 * Checks whether a value is text in the published form of a date property format, naming a moment that exists.
 * `DATE` is `YYYY-MM-DD` for an existing day, `DATE_TIME` is the UTC instant `YYYY-MM-DDTHH:mm:ss.sssZ`, and `TIME` is `HH:mm:ss` within one day.
 * @param {unknown} value - Value to check, usually a raw query string.
 * @param {EApiPropertyDateType} format - Date property format whose published pattern applies.
 * @returns {boolean} True when the value is text in that form.
 */
export function IsDateFormatValue(value: unknown, format: EApiPropertyDateType): value is string {
	if (typeof value !== "string") {
		return false;
	}

	switch (format) {
		case EApiPropertyDateType.DATE: {
			return IsCalendarDate(value);
		}

		case EApiPropertyDateType.DATE_TIME: {
			if (!DATE_TIME_PATTERN.test(value)) {
				return false;
			}

			const date: Date = new Date(value);

			return !Number.isNaN(date.getTime()) && date.toISOString() === value;
		}

		case EApiPropertyDateType.TIME: {
			const match: null | RegExpExecArray = TIME_PATTERN.exec(value);

			if (!match) {
				return false;
			}

			const [hours, minutes, seconds]: Array<number> = match.slice(1).map(Number);

			return hours !== undefined && minutes !== undefined && seconds !== undefined && hours < HOURS_PER_DAY && minutes < MINUTES_PER_HOUR && seconds < SECONDS_PER_MINUTE;
		}
	}
}
