import { Type } from "@nestjs/common";
import { PickType } from "@nestjs/swagger";

import LIST_DTO_CONSTANT from "../../constant/dto/list.constant";
import { ApiPropertyNumber, ApiPropertyObject } from "../../decorator";
import { EApiPropertyNumberType } from "../../enum";

type TClassType<T = any> = new (...arguments_: Array<any>) => T;

export function DtoGenerateGetListResponse(resourceClass: TClassType, responseResourceClass: TClassType): Type<unknown> {
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
			type: responseResourceClass,
		})
		items!: Array<TClassType>;

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

	return ApiListGetResponse;
}
