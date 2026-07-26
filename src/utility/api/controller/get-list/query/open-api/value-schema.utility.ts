import type { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType } from "@enum/decorator/api";
import { ApiControllerGetListQueryEnumValues } from "@utility/api/controller/get-list/query/enum-values.utility";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Builds the scalar OpenAPI value schema shared by every operator branch for a field.
 * @param {TApiPropertyDescribeProperties} metadata - Entity property metadata resolved into the query plan.
 * @returns {SchemaObject} OpenAPI schema for one scalar filter operand.
 */
export function ApiControllerGetListQueryOpenApiValueSchema(metadata: TApiPropertyDescribeProperties): SchemaObject {
	const propertyType: EApiPropertyDescribeType = metadata.type;

	if (propertyType === EApiPropertyDescribeType.OBJECT || propertyType === EApiPropertyDescribeType.RELATION) {
		throw ErrorException("GET_LIST query OpenAPI schemas support scalar fields only");
	}

	switch (propertyType) {
		case EApiPropertyDescribeType.BOOLEAN: {
			return { type: "boolean" };
		}

		case EApiPropertyDescribeType.DATE: {
			return { format: "format" in metadata ? metadata.format : EApiPropertyDateType.DATE_TIME, type: "string" };
		}

		case EApiPropertyDescribeType.ENUM: {
			if (!("enum" in metadata)) {
				throw ErrorException("GET_LIST enum query metadata is unavailable");
			}

			const enumValues: ReadonlyArray<number | string> = ApiControllerGetListQueryEnumValues(metadata.enum);
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
			const numberFormat: EApiPropertyNumberType | undefined = "format" in metadata ? (metadata.format as EApiPropertyNumberType) : undefined;

			return { type: numberFormat === EApiPropertyNumberType.INTEGER ? "integer" : "number" };
		}

		case EApiPropertyDescribeType.STRING: {
			return { type: "string" };
		}

		case EApiPropertyDescribeType.UUID: {
			return { format: "uuid", type: "string" };
		}
	}
}
