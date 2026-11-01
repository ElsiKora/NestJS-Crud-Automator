import type { ValidationArguments } from "class-validator";

import { IsCalendarDate } from "@utility/is/calendar-date.utility";
import { Transform } from "class-transformer";
import { ValidateBy } from "class-validator";

const INVALID_CALENDAR_DATE: string = "invalid calendar date";

/**
 * Builds the decorators that hold a GET_LIST filter value on a `date` column to calendar text, whether it arrives in `[value]` or `[values]`.
 * Apply them after the generated date decorators: class-transformer runs the last registered transform first, so text that is not `YYYY-MM-DD` for an existing day becomes an invalid Date before the date transform reads it, and the validator names the rule.
 * The route binds the raw text, never the Date the DTO instance holds, so the filter does not depend on the process time zone.
 * @param {boolean} isArray - Whether the decorated property is the `[values]` array.
 * @returns {Array<PropertyDecorator>} Transform and validator decorators for the filter property.
 */
export function DtoGenerateGetListCalendarDateDecorators(isArray: boolean): Array<PropertyDecorator> {
	return [
		Transform(({ value }: { value: unknown }): unknown => (isArray && Array.isArray(value) ? value.map((item: unknown): unknown => toCalendarText(item)) : toCalendarText(value)), { toClassOnly: true }),
		ValidateBy({
			name: "isCalendarDate",
			validator: {
				defaultMessage: (validationArguments?: ValidationArguments): string => `${isArray ? "each value in " : ""}${validationArguments?.property ?? "value"} must be a calendar date in YYYY-MM-DD format`,
				validate: (value: unknown): boolean => (isArray && Array.isArray(value) ? value.every((item: unknown): boolean => isValidDate(item)) : value === undefined || isValidDate(value)),
			},
		}),
	];
}

/**
 * Checks that a transformed filter value is a usable Date.
 * @param {unknown} value - Value after the date transform.
 * @returns {boolean} True for a Date with a time value.
 */
function isValidDate(value: unknown): boolean {
	return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * Keeps calendar text and absent values, and replaces anything else with text the date transform turns into an invalid Date.
 * @param {unknown} value - Raw filter value.
 * @returns {unknown} The value, or a marker that fails date validation.
 */
function toCalendarText(value: unknown): unknown {
	return value === undefined || IsCalendarDate(value) ? value : INVALID_CALENDAR_DATE;
}
