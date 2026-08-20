import type { Type } from "@nestjs/common";
import type { TDtoGenerateGetListResponseResourceClass } from "@type/utility";

import { API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH } from "@constant/api-controller-cursor.constant";
import { LIST_DTO_CONSTANT } from "@constant/dto";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { EApiPropertyStringType } from "@enum/decorator/api";
import { PickType } from "@nestjs/swagger";

/**
 * Generates a DTO for cursor-paginated list responses.
 * @param {TDtoGenerateGetListResponseResourceClass} resourceClass - The class representing the entity being listed
 * @param {TDtoGenerateGetListResponseResourceClass} responseResourceClass - The response DTO class for individual items
 * @param {string} name - The name for the generated DTO class
 * @returns {Type<unknown>} A generated DTO class for cursor-paginated list responses
 */
export function DtoGenerateGetListCursorResponse(resourceClass: TDtoGenerateGetListResponseResourceClass, responseResourceClass: TDtoGenerateGetListResponseResourceClass, name: string): Type<unknown> {
	class ApiListGetCursorResponse extends PickType(resourceClass, [] as const) {
		@ApiPropertyObject({
			entity: resourceClass,
			isArray: true,
			isResponse: true,
			isUniqueItems: true,
			maxItems: LIST_DTO_CONSTANT.MAXIMUM_LIST_LENGTH,
			minItems: 0,
			type: responseResourceClass,
		})
		items!: Array<TDtoGenerateGetListResponseResourceClass>;

		@ApiPropertyString({
			description: "Cursor for the next window",
			entity: resourceClass,
			exampleValue: "eyJ2IjoxLCJjIjoiLi4uIiwidmFsdWVzIjpbIi4uLiJdfQ",
			format: EApiPropertyStringType.STRING,
			isNullable: true,
			isRequired: true,
			isResponse: true,
			maxLength: API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH,
			minLength: 1,
			pattern: "/^[A-Za-z0-9_-]+$/",
		})
		nextCursor!: null | string;

		@ApiPropertyString({
			description: "Cursor for the previous window",
			entity: resourceClass,
			exampleValue: "eyJ2IjoxLCJjIjoiLi4uIiwidmFsdWVzIjpbIi4uLiJdfQ",
			format: EApiPropertyStringType.STRING,
			isNullable: true,
			isRequired: true,
			isResponse: true,
			maxLength: API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH,
			minLength: 1,
			pattern: "/^[A-Za-z0-9_-]+$/",
		})
		previousCursor!: null | string;
	}

	Object.defineProperty(ApiListGetCursorResponse, "name", {
		value: name,
	});

	return ApiListGetCursorResponse;
}
