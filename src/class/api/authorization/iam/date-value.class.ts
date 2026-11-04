import type { IApiAuthorizationIamDateValue } from "@interface/class/api/authorization";

import { PROPERTY_DATE_DECORATOR_API_CONSTANT } from "@constant/decorator/api/property-date.constant";
import { IsCalendarDate } from "@utility/is/calendar-date.utility";

// A date and time with a zone designator: optional seconds, and up to milliseconds after them.
const IAM_DATE_VALUE_INSTANT_PATTERN: RegExp = /^(?<date>\d{4}-\d{2}-\d{2})T(?<hour>\d{2}):(?<minute>\d{2})(?::(?<second>\d{2})(?:\.(?<fraction>\d{1,3}))?)?(?<zone>Z|[+-](?<zoneHour>\d{2}):(?<zoneMinute>\d{2}))$/;

// Largest hour of a time of day.
const IAM_DATE_VALUE_MAX_HOUR: number = 23;

// Largest minute or second of a time of day.
const IAM_DATE_VALUE_MAX_MINUTE: number = 59;

// Fraction digits of a date and time: milliseconds.
const IAM_DATE_VALUE_FRACTION_DIGITS: number = 3;

/**
 * Date values for the IAM Date operators: an instant, from a `Date` or from ISO 8601 text with a zone designator and at
 * most milliseconds, or a calendar date, from `YYYY-MM-DD` text. The two never compare with each other, and a value
 * outside the years 0001 to 9999 in UTC, which no column type holds alike, is no date.
 */
export class ApiAuthorizationIamDateValue {
	/**
	 * Compares two values: instants by their milliseconds, calendar dates by their text.
	 * @param {IApiAuthorizationIamDateValue} left - Left value.
	 * @param {IApiAuthorizationIamDateValue} right - Right value.
	 * @returns {number | undefined} -1, 0 or 1 as the left value is before, equal to or after the right one, or undefined when one is an instant and the other a calendar date.
	 */
	public static compare(left: IApiAuthorizationIamDateValue, right: IApiAuthorizationIamDateValue): number | undefined {
		if (left.isCalendar !== right.isCalendar) {
			return undefined;
		}

		if (left.epoch === right.epoch) {
			return 0;
		}

		return left.epoch < right.epoch ? -1 : 1;
	}

	/**
	 * Tells whether an instant is the second occurrence of an hour a daylight saving change repeats in the process time
	 * zone: a wall-clock column cannot store it apart from the first, and reads it back as the first.
	 * @param {Date} date - Instant.
	 * @returns {boolean} Whether the instant is that second occurrence.
	 */
	public static isRepeatedHour(date: Date): boolean {
		// Local fields resolve to the first occurrence of a repeated hour.
		const wallClock: Date = new Date(0);
		wallClock.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
		wallClock.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());

		return wallClock.getTime() !== date.getTime();
	}

	/**
	 * Reads a date value. A number is no date, as epoch seconds are not in the grammar.
	 * @param {unknown} value - A `Date`, ISO 8601 text with a zone designator, or `YYYY-MM-DD` text.
	 * @returns {IApiAuthorizationIamDateValue | undefined} The value, or undefined when it is none.
	 */
	public static parse(value: unknown): IApiAuthorizationIamDateValue | undefined {
		if (value instanceof Date) {
			return ApiAuthorizationIamDateValue.readInstant(value.getTime());
		}

		if (typeof value !== "string") {
			return undefined;
		}

		if (IsCalendarDate(value)) {
			return { epoch: Date.parse(`${value}T00:00:00.000Z`), isCalendar: true, text: value };
		}

		const groups: Record<string, string | undefined> | undefined = IAM_DATE_VALUE_INSTANT_PATTERN.exec(value)?.groups;

		if (!groups || !IsCalendarDate(groups.date) || !ApiAuthorizationIamDateValue.isClockInRange(groups)) {
			return undefined;
		}

		const fraction: string = (groups.fraction ?? "").padEnd(IAM_DATE_VALUE_FRACTION_DIGITS, "0");

		return ApiAuthorizationIamDateValue.readInstant(Date.parse(`${groups.date}T${groups.hour ?? ""}:${groups.minute ?? ""}:${groups.second ?? "00"}.${fraction}${groups.zone ?? ""}`));
	}

	/**
	 * Tells whether the time of day and the zone offset of a date and time are in range.
	 * @param {Record<string, string | undefined>} groups - Named groups of the date and time.
	 * @returns {boolean} Whether each part is in range.
	 */
	private static isClockInRange(groups: Record<string, string | undefined>): boolean {
		return Number(groups.hour) <= IAM_DATE_VALUE_MAX_HOUR && Number(groups.minute) <= IAM_DATE_VALUE_MAX_MINUTE && Number(groups.second ?? 0) <= IAM_DATE_VALUE_MAX_MINUTE && Number(groups.zoneHour ?? 0) <= IAM_DATE_VALUE_MAX_HOUR && Number(groups.zoneMinute ?? 0) <= IAM_DATE_VALUE_MAX_MINUTE;
	}

	/**
	 * Builds an instant from its milliseconds.
	 * @param {number} epoch - Milliseconds since the epoch.
	 * @returns {IApiAuthorizationIamDateValue | undefined} The value, or undefined when it is invalid or outside the years 0001 to 9999 in UTC.
	 */
	private static readInstant(epoch: number): IApiAuthorizationIamDateValue | undefined {
		if (Number.isNaN(epoch)) {
			return undefined;
		}

		const date: Date = new Date(epoch);
		const year: number = date.getUTCFullYear();

		return year >= PROPERTY_DATE_DECORATOR_API_CONSTANT.MINIMUM_YEAR && year <= PROPERTY_DATE_DECORATOR_API_CONSTANT.MAXIMUM_YEAR ? { epoch, isCalendar: false, text: date.toISOString() } : undefined;
	}
}
