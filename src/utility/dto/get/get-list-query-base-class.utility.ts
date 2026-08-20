import type { IApiControllerGetListQueryPlan, IApiControllerGetListQueryPlanOrderField } from "@interface/class/api/controller/get-list/query";
import type { Type } from "@nestjs/common";
import type { ObjectLiteral } from "typeorm";

import { API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH } from "@constant/api-controller-cursor.constant";
import { GET_LIST_QUERY_DTO_FACTORY_CONSTANT } from "@constant/factory-dto-get-list-query.constant";
import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { EApiControllerGetListQueryPaginationMode, EApiDtoType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOrderDirection } from "@enum/filter";
import { IApiEntity } from "@interface/entity";
import { ApiControllerGetListQueryGetPaginationMode } from "@utility/api/controller/get-list/query/get-pagination-mode.utility";
import { FilterOrderByFromEntity } from "@utility/api/filter-order-by-from-entity.utility";
import { CapitalizeString } from "@utility/capitalize-string.utility";
import { AllOrNoneOfListedPropertiesValidator } from "@validator/all-or-none-of-listed-properties.validator";
import { Validate } from "class-validator";

const noopPropertyDecorator: PropertyDecorator = (): void => undefined;
const noopApiPropertyEnum: typeof ApiPropertyEnum = (): PropertyDecorator => noopPropertyDecorator;

/**
 * Creates a base class for list query DTOs with pagination and sorting properties.
 * Includes limit, mode-specific pagination fields, and applicable sorting properties with
 * appropriate validation rules. CURSOR omits orderBy and orderDirection when the plan enables
 * no client-order fields.
 * @param {ObjectLiteral} entity - The entity class or prototype
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {EApiRouteType} method - The API route type (GET_LIST)
 * @param {EApiDtoType} dtoType - The type of DTO (QUERY)
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Optional normalized plan that narrows sortable fields.
 * @returns {Type<unknown>} A base class for list query DTOs
 * @template E - The entity type
 */
export function DtoGetGetListQueryBaseClass<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, method: EApiRouteType, dtoType: EApiDtoType, queryPlan?: IApiControllerGetListQueryPlan): Type<unknown> {
	const isCursor: boolean = ApiControllerGetListQueryGetPaginationMode(queryPlan) === EApiControllerGetListQueryPaginationMode.CURSOR;

	const orderBy: Record<string, string> =
		queryPlan && !queryPlan.order.isLegacy
			? Object.fromEntries(
					Object.values(queryPlan.order.fields)
						.filter((field: IApiControllerGetListQueryPlanOrderField): boolean => field.isEnabled)
						.map((field: IApiControllerGetListQueryPlanOrderField): [string, string] => [field.path, field.path]),
				)
			: FilterOrderByFromEntity(entity, entityMetadata, method, dtoType);
	const hasClientOrderFields: boolean = Object.keys(orderBy).length > 0;
	const shouldExposeClientOrder: boolean = !isCursor || hasClientOrderFields;
	const clientOrderPropertyDecorator: typeof ApiPropertyEnum = shouldExposeClientOrder ? ApiPropertyEnum : noopApiPropertyEnum;

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

		@clientOrderPropertyDecorator({
			description: "order by field",
			entity: entityMetadata,
			enum: orderBy,
			enumName: queryPlan ? `${queryPlan.schemaName}OrderBy` : `E${CapitalizeString(entityMetadata.name ?? "UnknownResource")}FilterOrderBy`,
			isRequired: false,
		})
		orderBy?: string;

		@clientOrderPropertyDecorator({
			description: "order direction",
			entity: entityMetadata,
			enum: EFilterOrderDirection,
			enumName: "EFilterOrderDirection",
			isRequired: false,
		})
		orderDirection?: EFilterOrderDirection;

		page!: number;

		public constructor() {
			if (isCursor) {
				Reflect.deleteProperty(this, "page");

				if (!shouldExposeClientOrder) {
					Reflect.deleteProperty(this, "orderBy");
					Reflect.deleteProperty(this, "orderDirection");
				}
			}
		}

		object(): this {
			return this;
		}
	}

	if (isCursor) {
		for (const [property, description] of [
			["after", "Cursor after which to return items"],
			["before", "Cursor before which to return items"],
		] as const) {
			ApiPropertyString({
				description,
				entity: entityMetadata,
				exampleValue: "eyJ2IjoxLCJjIjoiLi4uIiwidmFsdWVzIjpbIi4uLiJdfQ",
				format: EApiPropertyStringType.STRING,
				isRequired: false,
				maxLength: API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH,
				minLength: 1,
				pattern: "/^[A-Za-z0-9_-]+$/",
			})(BaseQueryDTO.prototype, property);
		}
	} else {
		ApiPropertyNumber({
			description: "Page to return",
			entity: entityMetadata,
			exampleValue: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
			format: EApiPropertyNumberType.INTEGER,
			isRequired: true,
			maximum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MAXIMUM_LIST_PAGES_COUNT,
			minimum: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_PAGES_COUNT,
			multipleOf: GET_LIST_QUERY_DTO_FACTORY_CONSTANT.LIST_MULTIPLE_OF,
		})(BaseQueryDTO.prototype, "page");
	}

	if (shouldExposeClientOrder) {
		Validate(AllOrNoneOfListedPropertiesValidator, ["orderBy", "orderDirection"])(BaseQueryDTO.prototype, "object");
	}

	return BaseQueryDTO;
}
