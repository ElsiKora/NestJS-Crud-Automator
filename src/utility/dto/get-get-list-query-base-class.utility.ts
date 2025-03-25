import type { Type } from "@nestjs/common";
import type { ObjectLiteral } from "typeorm/index";

import { Validate } from "class-validator";

import { GET_LIST_QUERY_DTO_FACTORY_CONSTANT } from "../../constant";
import { ApiPropertyEnum } from "../../decorator/api/property/enum.decorator";
import { ApiPropertyNumber } from "../../decorator/api/property/number.decorator";
import { EApiDtoType, EApiPropertyNumberType, EApiRouteType, EFilterOrderDirection } from "../../enum";
import { IApiEntity } from "../../interface";
import { AllOrNoneOfListedProperties } from "../../validator";
import { FilterOrderByFromEntity } from "../api/filter-order-by-from-entity.utility";
import { CapitalizeString } from "../capitalize-string.utility";

export function DtoGetGetListQueryBaseClass<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, method: EApiRouteType, dtoType: EApiDtoType): Type<unknown> {
	class BaseQueryDTO {
		@ApiPropertyNumber({
			description: "Items per page",
			entity: entityMetadata,
			exampleValue: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_LENGTH,
			format: EApiPropertyNumberType.INTEGER,
			isRequired: true,
			maximum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MAXIMUM_LIST_LENGTH,
			minimum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_LENGTH,
			multipleOf: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.LIST_MULTIPLE_OF,
		})
		limit!: number;

		@ApiPropertyEnum({
			description: "order by field",
			entity: entityMetadata,
			enum: FilterOrderByFromEntity(entity, entityMetadata, method, dtoType),
			enumName: `E${CapitalizeString(entityMetadata.name ?? "UnknownResource")}FilterOrderBy`,
			isRequired: false,
		})
		orderBy?: string;

		@ApiPropertyEnum({
			description: "order direction",
			entity: entityMetadata,
			enum: EFilterOrderDirection,
			enumName: "EFilterOrderDirection",
			isRequired: false,
		})
		orderDirection?: EFilterOrderDirection;

		@ApiPropertyNumber({
			description: "Page to return",
			entity: entityMetadata,
			exampleValue: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
			format: EApiPropertyNumberType.INTEGER,
			isRequired: true,
			maximum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MAXIMUM_LIST_PAGES_COUNT,
			minimum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
			multipleOf: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.LIST_MULTIPLE_OF,
		})
		page!: number;

		@Validate(AllOrNoneOfListedProperties, ["orderBy", "orderDirection"])
		object(): this {
			return this;
		}
	}

	return BaseQueryDTO;
}
