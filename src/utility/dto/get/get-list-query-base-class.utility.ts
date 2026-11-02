import type { IApiControllerGetListQueryPlan, IApiControllerGetListQueryPlanOrderField } from "@interface/class/api/controller/get-list/query";
import type { CanActivate, Type } from "@nestjs/common";
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
import { ApiControllerGetListResponsePublishedFields } from "@utility/api/controller/get-list/response-published-fields.utility";
import { FilterOrderByFromEntity } from "@utility/api/filter-order-by-from-entity.utility";
import { CapitalizeString } from "@utility/capitalize-string.utility";
import { DtoGetListQueryDeferOrder } from "@utility/dto/get/list-query-defer-order.utility";
import { AllOrNoneOfListedPropertiesValidator } from "@validator/all-or-none-of-listed-properties.validator";
import { Equals, Validate } from "class-validator";

const noopPropertyDecorator: PropertyDecorator = (): void => undefined;
const noopApiPropertyEnum: typeof ApiPropertyEnum = (): PropertyDecorator => noopPropertyDecorator;

/**
 * Creates a base class for list query DTOs with pagination and sorting properties.
 * Includes limit, mode-specific pagination fields, and applicable sorting properties with
 * appropriate validation rules. When no field is orderable, orderBy and orderDirection are left
 * out of the documentation and any value sent for them fails validation.
 * @param {ObjectLiteral} entity - The entity class or prototype
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {EApiRouteType} method - The API route type (GET_LIST)
 * @param {EApiDtoType} dtoType - The type of DTO (QUERY)
 * @param {string} schemaPrefix - Schema prefix of the controller that owns the route, from `ApiControllerGetSchemaPrefix`; it starts every generated DTO name
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Optional normalized plan that narrows sortable fields.
 * @param {Type<CanActivate>} [currentGuard] - Route guard that decides which columns are orderable.
 * @param {ReadonlyArray<Type<unknown>> | Type<unknown>} [listResponseDto] - Manual or item-config list response DTO of the route, or the response variants of a custom one; their published item properties limit ordering.
 * @returns {Type<unknown>} A base class for list query DTOs
 * @template E - The entity type
 */
export function DtoGetGetListQueryBaseClass<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, method: EApiRouteType, dtoType: EApiDtoType, schemaPrefix: string, queryPlan?: IApiControllerGetListQueryPlan, currentGuard?: Type<CanActivate>, listResponseDto?: ReadonlyArray<Type<unknown>> | Type<unknown>): Type<unknown> {
	const isCursor: boolean = ApiControllerGetListQueryGetPaginationMode(queryPlan) === EApiControllerGetListQueryPaginationMode.CURSOR;
	let resolvedOrderBy: Record<string, string> | undefined;

	// A list response may name classes that do not exist yet while this runs, so its fields are read on first use and a failed read is retried.
	const resolveOrderBy = (): Record<string, string> => {
		resolvedOrderBy ??= readOrderBy();

		return resolvedOrderBy;
	};

	const readOrderBy = (): Record<string, string> => {
		const publishedFields: ReadonlySet<string> | undefined = listResponseDto ? ApiControllerGetListResponsePublishedFields(listResponseDto) : undefined;

		if (!queryPlan || queryPlan.order.isLegacy) {
			return FilterOrderByFromEntity(entity, entityMetadata, method, dtoType, undefined, currentGuard, publishedFields);
		}

		return Object.fromEntries(
			Object.values(queryPlan.order.fields)
				.filter((field: IApiControllerGetListQueryPlanOrderField): boolean => field.isEnabled && (!publishedFields || publishedFields.has(field.path)))
				.map((field: IApiControllerGetListQueryPlanOrderField): [string, string] => [field.path, field.path]),
		);
	};

	const isOrderDeferred: boolean = listResponseDto !== undefined;
	const eagerOrderBy: Record<string, string> = isOrderDeferred ? {} : resolveOrderBy();
	const hasClientOrderFields = (): boolean => Object.keys(resolveOrderBy()).length > 0;
	const clientOrderPropertyDecorator: typeof ApiPropertyEnum = !isOrderDeferred && hasClientOrderFields() ? ApiPropertyEnum : noopApiPropertyEnum;

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
			enum: eagerOrderBy,
			enumName: queryPlan ? `${queryPlan.schemaName}OrderBy` : `E${CapitalizeString(schemaPrefix)}FilterOrderBy`,
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
			}

			if (!hasClientOrderFields()) {
				Reflect.deleteProperty(this, "orderBy");
				Reflect.deleteProperty(this, "orderDirection");
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

	if (isOrderDeferred) {
		DtoGetListQueryDeferOrder(BaseQueryDTO, entityMetadata, resolveOrderBy);
	} else if (hasClientOrderFields()) {
		// class-validator drops an inherited validator on a property the derived class also validates, and the generated DTO validates "object", so the pair check has a property of its own.
		Validate(AllOrNoneOfListedPropertiesValidator, ["orderBy", "orderDirection"], { message: "ORDER_NOT_VALID" })(BaseQueryDTO.prototype, "orderPair");
	} else {
		// An empty orderBy enum is not valid OpenAPI, so the route documents no order and refuses any it receives.
		for (const property of ["orderBy", "orderDirection"] as const) {
			Equals(undefined, { message: `${property} is not accepted because no field of this route is orderable` })(BaseQueryDTO.prototype, property);
		}
	}

	return BaseQueryDTO;
}
