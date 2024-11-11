import { PickType } from "@nestjs/swagger";

import LIST_DTO_CONSTANT from "../../constant/dto/list.constant";
import { ApiPropertyNumber, ApiPropertyObject } from "../../decorator";
import { EApiPropertyDataType } from "../../enum";
import {Type} from "@nestjs/common";

type TClassType<T = any> = new (...arguments_: Array<any>) => T;

export function DtoGenerateGetListResponse<T extends TClassType, R extends TClassType>(resourceClass: T, responseResourceClass: R): Type<unknown> {
	class ApiListGetResponse extends PickType(resourceClass, [] as const) {
		@ApiPropertyNumber({
			description: "Total number of items on page",
			entity: resourceClass,
			example: 1,
			expose: true,
			maximum: LIST_DTO_CONSTANT.MAXIMUM_LIST_LENGTH,
			minimum: LIST_DTO_CONSTANT.MINIMUM_LIST_LENGTH,
			multipleOf: 1,
			response: true,
			type: EApiPropertyDataType.INTEGER,
		})
		count!: number;

		@ApiPropertyNumber({
			description: "Current page number",
			entity: resourceClass,
			example: 1,
			expose: true,
			maximum: LIST_DTO_CONSTANT.MAXIMUM_LIST_PAGES_COUNT,
			minimum: LIST_DTO_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
			multipleOf: 1,
			response: true,
			type: EApiPropertyDataType.INTEGER,
		})
		currentPage!: number;

		@ApiPropertyObject({
			entity: resourceClass,
			expose: true,
			isArray: true,
			maxItems: LIST_DTO_CONSTANT.MAXIMUM_LIST_LENGTH,
			minItems: LIST_DTO_CONSTANT.MINIMUM_LIST_LENGTH,
			response: true,
			type: responseResourceClass,
			uniqueItems: true,
		})
		items!: Array<R>;

		@ApiPropertyNumber({
			description: "Total number of items",
			entity: resourceClass,
			example: LIST_DTO_CONSTANT.MINIMUM_LIST_LENGTH,
			expose: true,
			maximum: LIST_DTO_CONSTANT.MAXIMUM_LIST_LENGTH,
			minimum: LIST_DTO_CONSTANT.MINIMUM_LIST_LENGTH,
			multipleOf: 1,
			response: true,
			type: EApiPropertyDataType.INTEGER,
		})
		totalCount!: number;

		@ApiPropertyNumber({
			description: "Total number of pages",
			entity: resourceClass,
			example: LIST_DTO_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
			expose: true,
			maximum: LIST_DTO_CONSTANT.MAXIMUM_LIST_PAGES_COUNT,
			minimum: LIST_DTO_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
			multipleOf: 1,
			response: true,
			type: EApiPropertyDataType.INTEGER,
		})
		totalPages!: number;
	}

	return ApiListGetResponse;
}
