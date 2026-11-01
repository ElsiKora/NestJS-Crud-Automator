import type { TApiPropertyObjectWithDiscriminatorProperties, TApiPropertyObjectWithoutDiscriminatorProperties } from "@type/decorator/api/property";

import { LIST_DTO_CONSTANT } from "@constant/dto";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { EApiPropertyNumberType } from "@enum/decorator/api";
import { Type } from "@nestjs/common";
import { PickType } from "@nestjs/swagger";
import { TDtoGenerateGetListResponseResourceClass } from "@type/utility";
import { DtoSetGeneratedName } from "@utility/dto/set-generated-name.utility";

/**
 * Generates a DTO for paginated list responses with appropriate metadata.
 * Creates a class with count, currentPage, items, totalCount, and totalPages properties,
 * all properly decorated with Swagger and validation decorators.
 * @param {TDtoGenerateGetListResponseResourceClass} resourceClass - The class representing the entity being listed
 * @param {Pick<TApiPropertyObjectWithDiscriminatorProperties, "discriminator" | "type"> | TDtoGenerateGetListResponseResourceClass} responseResourceClass - The response DTO class for individual items, or every item variant with the discriminator selecting it
 * @param {string} name - The name for the generated DTO class
 * @param {string} [origin] - Where the wrapper comes from, used by the OpenAPI component name check; defaults to the list response of the entity
 * @returns {Type<unknown>} A generated DTO class for paginated list responses
 */
export function DtoGenerateGetListResponse(resourceClass: TDtoGenerateGetListResponseResourceClass, responseResourceClass: Pick<TApiPropertyObjectWithDiscriminatorProperties, "discriminator" | "type"> | TDtoGenerateGetListResponseResourceClass, name: string, origin?: string): Type<unknown> {
	const itemsProperties: Pick<TApiPropertyObjectWithDiscriminatorProperties, "discriminator" | "type"> | Pick<TApiPropertyObjectWithoutDiscriminatorProperties, "type"> = typeof responseResourceClass === "function" ? { type: responseResourceClass } : { discriminator: responseResourceClass.discriminator, type: responseResourceClass.type };

	class ApiListGetResponse extends PickType(resourceClass, [] as const) {
		@ApiPropertyNumber({
			description: "Total number of items on page",
			entity: resourceClass,
			exampleValue: LIST_DTO_CONSTANT.MINIMUM_LIST_LENGTH,
			format: EApiPropertyNumberType.INTEGER,
			isResponse: true,
			maximum: LIST_DTO_CONSTANT.MAXIMUM_LIST_LENGTH,
			minimum: LIST_DTO_CONSTANT.MINIMUM_LIST_LENGTH,
			multipleOf: 1,
		})
		count!: number;

		@ApiPropertyNumber({
			description: "Current page number",
			entity: resourceClass,
			exampleValue: LIST_DTO_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
			format: EApiPropertyNumberType.INTEGER,
			isResponse: true,
			maximum: LIST_DTO_CONSTANT.MAXIMUM_LIST_PAGES_COUNT,
			minimum: LIST_DTO_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
			multipleOf: 1,
		})
		currentPage!: number;

		@ApiPropertyObject({
			entity: resourceClass,
			isArray: true,
			isResponse: true,
			isUniqueItems: true,
			maxItems: LIST_DTO_CONSTANT.MAXIMUM_LIST_LENGTH,
			minItems: LIST_DTO_CONSTANT.MINIMUM_LIST_LENGTH,
			...itemsProperties,
		})
		items!: Array<TDtoGenerateGetListResponseResourceClass>;

		@ApiPropertyNumber({
			description: "Total number of items",
			entity: resourceClass,
			exampleValue: LIST_DTO_CONSTANT.MINIMUM_LIST_LENGTH,
			format: EApiPropertyNumberType.INTEGER,
			isResponse: true,
			maximum: LIST_DTO_CONSTANT.MAXIMUM_LIST_LENGTH,
			minimum: LIST_DTO_CONSTANT.MINIMUM_LIST_LENGTH,
			multipleOf: 1,
		})
		totalCount!: number;

		@ApiPropertyNumber({
			description: "Total number of pages",
			entity: resourceClass,
			exampleValue: LIST_DTO_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
			format: EApiPropertyNumberType.INTEGER,
			isResponse: true,
			maximum: LIST_DTO_CONSTANT.MAXIMUM_LIST_PAGES_COUNT,
			minimum: LIST_DTO_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
			multipleOf: 1,
		})
		totalPages!: number;
	}

	DtoSetGeneratedName(ApiListGetResponse, name, origin ?? `the getList page response of entity ${resourceClass.name}`);

	return ApiListGetResponse;
}
