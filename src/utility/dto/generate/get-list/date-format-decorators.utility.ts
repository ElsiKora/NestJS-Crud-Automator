import type { ValidationArguments } from "class-validator";

import { PROPERTY_DATE_DECORATOR_API_CONSTANT } from "@constant/decorator/api/property-date.constant";
import { EApiPropertyDateType } from "@enum/decorator/api/property/date/type.enum";
import { IsDateFormatValue } from "@utility/is/date-format-value.utility";
import { Transform } from "class-transformer";
import { ValidateBy } from "class-validator";

const INVALID_DATE_FORMAT_VALUE: string = "invalid date format value";
const TIME_REFERENCE_DATE: string = "1970-01-01";

/**
 * Builds the decorators that hold a GET_LIST filter value on a date property to the published text form of its format, whether it arrives in `[value]` or `[values]`.
 * Apply them after the generated date decorators: class-transformer runs the last registered transform first, so text outside the published form becomes an invalid Date before the date transform reads it, and the validator names the form.
 * A `TIME` value is read on a fixed reference day so the date transform can hold it. A valid Date on a `DATE_TIME` property is a server-side value, such as one a route subscriber wrote, and passes as it is.
 * @param {EApiPropertyDateType} format - Date property format whose published pattern applies.
 * @param {boolean} isArray - Whether the decorated property is the `[values]` array.
 * @returns {Array<PropertyDecorator>} Transform and validator decorators for the filter property.
 */
export function DtoGenerateGetListDateFormatDecorators(format: EApiPropertyDateType, isArray: boolean): Array<PropertyDecorator> {
	return [
		Transform(({ value }: { value: unknown }): unknown => (isArray && Array.isArray(value) ? value.map((item: unknown): unknown => toDateTransformInput(item, format)) : toDateTransformInput(value, format)), { toClassOnly: true }),
		ValidateBy({
			name: "isDateFormatValue",
			validator: {
				defaultMessage: (validationArguments?: ValidationArguments): string => `${isArray ? "each value in " : ""}${validationArguments?.property ?? "value"} must be in ${PROPERTY_DATE_DECORATOR_API_CONSTANT.TEMPLATE[format]} format`,
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
 * Keeps text in the published form, a valid Date on a date-time property, and absent values, and replaces anything else with text the date transform turns into an invalid Date.
 * @param {unknown} value - Raw filter value.
 * @param {EApiPropertyDateType} format - Date property format whose published pattern applies.
 * @returns {unknown} The value the date transform reads.
 */
function toDateTransformInput(value: unknown, format: EApiPropertyDateType): unknown {
	if (value === undefined || (format === EApiPropertyDateType.DATE_TIME && value instanceof Date && !Number.isNaN(value.getTime()))) {
		return value;
	}

	if (!IsDateFormatValue(value, format)) {
		return INVALID_DATE_FORMAT_VALUE;
	}

	return format === EApiPropertyDateType.TIME ? `${TIME_REFERENCE_DATE}T${value}Z` : value;
}
