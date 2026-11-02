import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType } from "@enum/decorator/api";
import { BadRequestException } from "@nestjs/common";
import { EnumValues } from "@utility/enum/values.utility";
import { IsDateFormatValue } from "@utility/is/date-format-value.utility";
import { NumberParseCanonicalDecimal, NumberParseCanonicalInteger } from "@utility/number";

const UUID_VALUE_PATTERN: RegExp = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/iu;

/**
 * Parses one GET_LIST filter value into the value the query binds, by the describe kind of its field.
 * Calendar dates and times of day stay the text the client sent; only an instant becomes a Date.
 * @param {unknown} value - One filter value as the request carries it
 * @param {Readonly<TApiPropertyDescribeProperties>} metadata - Describe metadata of the filtered field
 * @returns {unknown} The value to bind
 * @throws {BadRequestException} FILTER_NOT_VALID when the value is outside the published schema of the field
 */
export function ApiControllerGetListQueryParseValue(value: unknown, metadata: Readonly<TApiPropertyDescribeProperties>): unknown {
	switch (metadata.type) {
		case EApiPropertyDescribeType.BOOLEAN: {
			if (value === true || value === "true") {
				return true;
			}

			if (value === false || value === "false") {
				return false;
			}

			break;
		}

		case EApiPropertyDescribeType.DATE: {
			if (metadata.format !== EApiPropertyDateType.DATE_TIME) {
				if (IsDateFormatValue(value, metadata.format)) {
					return value;
				}

				break;
			}

			if (value instanceof Date && !Number.isNaN(value.getTime())) {
				return value;
			}

			if (IsDateFormatValue(value, metadata.format)) {
				return new Date(value);
			}

			break;
		}

		case EApiPropertyDescribeType.ENUM: {
			const enumValues: ReadonlyArray<number | string> = EnumValues(metadata.enum);
			const enumValue: number | string | undefined = enumValues.find((candidate: number | string): boolean => candidate === value || (typeof candidate === "number" && typeof value === "string" && String(candidate) === value));

			if (enumValue !== undefined) {
				return enumValue;
			}

			break;
		}

		case EApiPropertyDescribeType.NUMBER: {
			let numberValue: number = Number.NaN;

			if (typeof value === "number") {
				numberValue = value;
			} else if (typeof value === "string") {
				numberValue = metadata.format === EApiPropertyNumberType.INTEGER ? NumberParseCanonicalInteger(value) : NumberParseCanonicalDecimal(value);
			}

			if (Number.isFinite(numberValue) && (metadata.format !== EApiPropertyNumberType.INTEGER || Number.isInteger(numberValue))) {
				return numberValue;
			}

			break;
		}

		// A filter compares a scalar column, never an object or relation as a whole.
		case EApiPropertyDescribeType.OBJECT: {
			break;
		}

		case EApiPropertyDescribeType.RELATION: {
			break;
		}

		case EApiPropertyDescribeType.STRING: {
			if (typeof value === "string") {
				return value;
			}

			break;
		}

		case EApiPropertyDescribeType.UUID: {
			if (typeof value === "string" && UUID_VALUE_PATTERN.test(value)) {
				return value.toLowerCase();
			}

			break;
		}
	}

	throw new BadRequestException("FILTER_NOT_VALID");
}
