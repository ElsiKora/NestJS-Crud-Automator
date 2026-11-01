import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { TSwaggerSchemaObject } from "@type/swagger";

import { EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType } from "@enum/decorator/api";
import { EnumValues } from "@utility/enum/values.utility";
import { ErrorException } from "@utility/error/exception.utility";

const CALENDAR_DATE_LENGTH: number = "YYYY-MM-DD".length;

/**
 * Builds the scalar OpenAPI value schema shared by every operator branch for a field.
 * Number bounds, string format, length and pattern, and the calendar text of a `date` column are the same constraints the route validates through the generated QUERY DTO.
 * @param {TApiPropertyDescribeProperties} metadata - Entity property metadata resolved into the query plan.
 * @returns {TSwaggerSchemaObject} OpenAPI schema for one scalar filter operand.
 */
export function ApiControllerGetListQueryOpenApiValueSchema(metadata: TApiPropertyDescribeProperties): TSwaggerSchemaObject {
	if (metadata.type === EApiPropertyDescribeType.OBJECT || metadata.type === EApiPropertyDescribeType.RELATION) {
		throw ErrorException("GET_LIST query OpenAPI schemas support scalar fields only");
	}

	switch (metadata.type) {
		case EApiPropertyDescribeType.BOOLEAN: {
			return { type: "boolean" };
		}

		case EApiPropertyDescribeType.DATE: {
			const format: EApiPropertyDateType = "format" in metadata ? metadata.format : EApiPropertyDateType.DATE_TIME;

			return format === EApiPropertyDateType.DATE ? { format, maxLength: CALENDAR_DATE_LENGTH, minLength: CALENDAR_DATE_LENGTH, pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$", type: "string" } : { format, type: "string" };
		}

		case EApiPropertyDescribeType.ENUM: {
			if (!("enum" in metadata)) {
				throw ErrorException("GET_LIST enum query metadata is unavailable");
			}

			const enumValues: ReadonlyArray<number | string> = EnumValues(metadata.enum);
			const hasNumericValues: boolean = enumValues.some((value: number | string): boolean => typeof value === "number");
			const hasStringValues: boolean = enumValues.some((value: number | string): boolean => typeof value === "string");
			let valueType: "number" | "string" | undefined;

			if (!hasNumericValues) {
				valueType = "string";
			} else if (!hasStringValues) {
				valueType = "number";
			}

			return {
				enum: [...enumValues],
				type: valueType,
			};
		}

		case EApiPropertyDescribeType.NUMBER: {
			return {
				maximum: metadata.maximum,
				minimum: metadata.minimum,
				multipleOf: metadata.multipleOf,
				type: metadata.format === EApiPropertyNumberType.INTEGER ? "integer" : "number",
			};
		}

		case EApiPropertyDescribeType.STRING: {
			return {
				format: metadata.format,
				maxLength: metadata.maxLength,
				minLength: metadata.minLength,
				pattern: metadata.pattern.slice(1, -1),
				type: "string",
			};
		}

		case EApiPropertyDescribeType.UUID: {
			return { format: "uuid", type: "string" };
		}
	}
}
