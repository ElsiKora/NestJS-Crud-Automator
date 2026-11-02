import type { Type } from "@nestjs/common";
import type { TApiPropertyObjectDeclaredClass, TApiPropertyObjectWithDiscriminatorProperties } from "@type/decorator/api/property";
import type { TDtoGenerateGetListResponseResourceClass } from "@type/utility";

import { API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH } from "@constant/api-controller-cursor.constant";
import { LIST_DTO_CONSTANT } from "@constant/dto";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { EApiPropertyStringType } from "@enum/decorator/api";
import { PickType } from "@nestjs/swagger";
import { DtoSetGeneratedName } from "@utility/dto/set-generated-name.utility";

/**
 * Generates a DTO for cursor-paginated list responses.
 * @param {TDtoGenerateGetListResponseResourceClass} resourceClass - The class representing the entity being listed
 * @param {Pick<TApiPropertyObjectWithDiscriminatorProperties, "discriminator" | "type"> | TDtoGenerateGetListResponseResourceClass} responseResourceClass - The response DTO class for individual items, or every item variant with the discriminator selecting it
 * @param {string} name - The name for the generated DTO class
 * @param {string} [origin] - Where the wrapper comes from, used by the OpenAPI component name check; defaults to the list response of the entity
 * @returns {Type<unknown>} A generated DTO class for cursor-paginated list responses
 */
export function DtoGenerateGetListCursorResponse(resourceClass: TDtoGenerateGetListResponseResourceClass, responseResourceClass: Pick<TApiPropertyObjectWithDiscriminatorProperties, "discriminator" | "type"> | TDtoGenerateGetListResponseResourceClass, name: string, origin?: string): Type<unknown> {
	const itemsProperties: { type: TApiPropertyObjectDeclaredClass } | Pick<TApiPropertyObjectWithDiscriminatorProperties, "discriminator" | "type"> = typeof responseResourceClass === "function" ? { type: responseResourceClass } : { discriminator: responseResourceClass.discriminator, type: responseResourceClass.type };

	class ApiListGetCursorResponse extends PickType(resourceClass, [] as const) {
		@ApiPropertyObject({
			entity: resourceClass,
			isArray: true,
			isResponse: true,
			isUniqueItems: true,
			maxItems: LIST_DTO_CONSTANT.MAXIMUM_LIST_LENGTH,
			minItems: 0,
			...itemsProperties,
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

	DtoSetGeneratedName(ApiListGetCursorResponse, name, origin ?? `the getList cursor response of entity ${resourceClass.name}`);

	return ApiListGetCursorResponse;
}
