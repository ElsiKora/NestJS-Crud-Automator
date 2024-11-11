import type { Type } from "@nestjs/common";

import { Validate } from "class-validator";

import { GET_LIST_QUERY_DTO_FACTORY_CONSTANT, NUMBER_CONSTANT } from "../../constant";
import { ApiPropertyNumber } from "../../decorator/api/property/number.decorator";
import { ApiPropertyObject } from "../../decorator/api/property/object.decorator";
import {EApiDtoType, EApiPropertyDataType, EApiRouteType, EFilterOrderDirection} from "../../enum";
import { IApiEntity } from "../../interface";
import { AllOrNoneOfListedProperties } from "../../validator";
import {FilterOrderByFromEntity} from "../api";
import type {ObjectLiteral} from "typeorm/index";

export function DtoGetBaseClass<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, method: EApiRouteType, dtoType: EApiDtoType,): Type<unknown> {
	class BaseQueryDTO {
		@ApiPropertyNumber({
			description: "Items per page",
			entity: entityMetadata,
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
			entity: entityMetadata,
			enum: FilterOrderByFromEntity(entity, entityMetadata, method, dtoType),
			enumName: "EFilterOrderBy",
			required: false,
		})
		orderBy?: string;

		@ApiPropertyObject({
			description: "order direction",
			entity: entityMetadata,
			enum: EFilterOrderDirection,
			enumName: "EFilterOrderDirection",
			required: false,
		})
		orderDirection?: EFilterOrderDirection;

		@ApiPropertyNumber({
			description: "Page to return",
			entity: entityMetadata,
			example: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
			maximum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MAXIMUM_LIST_PAGES_COUNT,
			minimum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
			multipleOf: NUMBER_CONSTANT.ONE,
			required: true,
			type: EApiPropertyDataType.INTEGER,
		})
		page!: number;

		@Validate(AllOrNoneOfListedProperties, ["orderBy", "orderDirection"])
		object(): this {
			return this;
		}
	}

	return BaseQueryDTO;
}
