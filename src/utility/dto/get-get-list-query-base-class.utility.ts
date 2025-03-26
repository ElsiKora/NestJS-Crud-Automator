import type { Type } from "@nestjs/common";
import type { ObjectLiteral } from "typeorm/index";

import { GET_LIST_QUERY_DTO_FACTORY_CONSTANT } from "@constant/factory/dto";
import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { EApiDtoType, EApiPropertyNumberType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOrderDirection } from "@enum/filter-order-direction.enum";
import { IApiEntity } from "@interface/entity";
import { FilterOrderByFromEntity } from "@utility/api/filter-order-by-from-entity.utility";
import { CapitalizeString } from "@utility/capitalize-string.utility";
import { AllOrNoneOfListedPropertiesValidator } from "@validator/all-or-none-of-listed-properties.validator";
import { Validate } from "class-validator";

/**
 * Creates a base class for list query DTOs with pagination and sorting properties.
 * Includes limit, orderBy, orderDirection, and page fields with appropriate validation rules
 * to ensure consistent pagination behavior.
 * @param {ObjectLiteral} entity - The entity class or prototype
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {EApiRouteType} method - The API route type (GET_LIST)
 * @param {EApiDtoType} dtoType - The type of DTO (QUERY)
 * @returns {Type<unknown>} A base class for list query DTOs
 * @template E - The entity type
 */
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

		@Validate(AllOrNoneOfListedPropertiesValidator, ["orderBy", "orderDirection"])
		object(): this {
			return this;
		}
	}

	return BaseQueryDTO;
}
