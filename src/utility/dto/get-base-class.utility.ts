import { Validate } from "class-validator";

import { GET_LIST_QUERY_DTO_FACTORY_CONSTANT, NUMBER_CONSTANT } from "../../constant";
import { ApiPropertyNumber, ApiPropertyObject } from "../../decorator";
import { EApiPropertyDataType, EFilterOrderDirection } from "../../enum";
import { IApiEntity } from "../../interface";

import { AllOrNoneOfListedProperties } from "../../validator";

import type { Type } from "@nestjs/common";

export function DtoGetBaseClass(entity: IApiEntity): Type<any> {
	class BaseQueryDTO {
		@ApiPropertyNumber({
			description: "Items per page",
			entity,
			example: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_LENGTH,
			maximum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MAXIMUM_LIST_LENGTH,
			minimum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_LENGTH,
			multipleOf: NUMBER_CONSTANT.ONE,
			required: true,
			type: EApiPropertyDataType.INTEGER,
		})
		limit!: number;

		@ApiPropertyObject({
			description: "order by field",
			entity,
			required: false,
		})
		orderBy?: string;

		@ApiPropertyObject({
			description: "order direction",
			entity,
			enum: EFilterOrderDirection,
			required: false,
		})
		orderDirection?: EFilterOrderDirection;

		@Validate(AllOrNoneOfListedProperties, ["orderBy", "orderDirection"])
		object(): this {
			return this;
		}
	}

	return BaseQueryDTO;
}
