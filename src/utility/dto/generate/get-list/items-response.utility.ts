import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { Type } from "@nestjs/common";
import type { TApiPropertyObjectWithDiscriminatorProperties } from "@type/decorator/api/property";
import type { TDtoGenerateGetListResponseResourceClass } from "@type/utility";
import type { ObjectLiteral } from "typeorm";

import { EApiControllerGetListQueryPaginationMode, EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { ApiControllerGetListQueryGetPaginationMode } from "@utility/api/controller/get-list/query/get-pagination-mode.utility";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { DtoGenerateGetListCursorResponse } from "@utility/dto/generate/get-list/cursor-response.utility";
import { DtoGenerateGetListResponse } from "@utility/dto/generate/get-list/response.utility";

/**
 * Wraps generated GET_LIST item DTOs in the page or cursor envelope selected by the query plan.
 * @param {ObjectLiteral} entity - The entity class owning the list.
 * @param {Pick<TApiPropertyObjectWithDiscriminatorProperties, "discriminator" | "type"> | Type<unknown>} itemDto - The item DTO, or every item variant with the discriminator selecting it.
 * @param {string} schemaPrefix - Schema prefix of the controller that owns the route, from `ApiControllerGetSchemaPrefix`; it starts every generated DTO name
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Compiled plan selecting the pagination envelope.
 * @returns {Type<unknown>} The generated list wrapper DTO class.
 */
export function DtoGenerateGetListItemsResponse(entity: ObjectLiteral, itemDto: Pick<TApiPropertyObjectWithDiscriminatorProperties, "discriminator" | "type"> | Type<unknown>, schemaPrefix: string, queryPlan?: IApiControllerGetListQueryPlan): Type<unknown> {
	const resourceName: string = `${schemaPrefix}${CamelCaseString(EApiRouteType.GET_LIST)}`;
	// The entity is a constructor at runtime; ObjectLiteral only does not say so.
	const resourceClass: TDtoGenerateGetListResponseResourceClass = entity as TDtoGenerateGetListResponseResourceClass;

	return ApiControllerGetListQueryGetPaginationMode(queryPlan) === EApiControllerGetListQueryPaginationMode.CURSOR
		? DtoGenerateGetListCursorResponse(resourceClass, itemDto, `${resourceName}Cursor${CamelCaseString(EApiDtoType.RESPONSE)}ItemsDTO`, `the getList cursor response of controller prefix "${schemaPrefix}"`)
		: DtoGenerateGetListResponse(resourceClass, itemDto, `${resourceName}${CamelCaseString(EApiDtoType.RESPONSE)}ItemsDTO`, `the getList page response of controller prefix "${schemaPrefix}"`);
}
