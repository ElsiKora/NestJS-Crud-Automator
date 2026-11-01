import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TTypeDiscriminator } from "@type/decorator/api/property";
import type { ObjectLiteral } from "typeorm";

import { EApiControllerGetListQueryPaginationMode, EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { ApiControllerGetListQueryGetPaginationMode } from "@utility/api/controller/get-list/query/get-pagination-mode.utility";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { DtoGenerateGetListCursorResponse } from "@utility/dto/generate/get-list/cursor-response.utility";
import { DtoGenerateGetListResponse } from "@utility/dto/generate/get-list/response.utility";

/**
 * Wraps generated GET_LIST item DTOs in the page or cursor envelope selected by the query plan.
 * @template E - The entity type.
 * @param {ObjectLiteral} entity - The entity class owning the list.
 * @param {IApiEntity<E>} entityMetadata - The entity metadata used for the wrapper name.
 * @param {Array<Type<unknown>> | Type<unknown>} itemDto - The item DTO, or every item variant.
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Compiled plan selecting the pagination envelope.
 * @param {TTypeDiscriminator} [itemDiscriminator] - Discriminator selecting the item DTO when items are polymorphic.
 * @returns {Type<unknown>} The generated list wrapper DTO class.
 */
export function DtoGenerateGetListItemsResponse<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, itemDto: Array<Type<unknown>> | Type<unknown>, queryPlan?: IApiControllerGetListQueryPlan, itemDiscriminator?: TTypeDiscriminator): Type<unknown> {
	const resourceName: string = `${entityMetadata.name ?? "UnknownResource"}${CamelCaseString(EApiRouteType.GET_LIST)}`;

	// @ts-ignore The generated entity/DTO constructors satisfy the wrapper generator at runtime.
	return ApiControllerGetListQueryGetPaginationMode(queryPlan) === EApiControllerGetListQueryPaginationMode.CURSOR ? DtoGenerateGetListCursorResponse(entity, itemDto, `${resourceName}Cursor${CamelCaseString(EApiDtoType.RESPONSE)}ItemsDTO`, itemDiscriminator) : DtoGenerateGetListResponse(entity, itemDto, `${resourceName}${CamelCaseString(EApiDtoType.RESPONSE)}ItemsDTO`, itemDiscriminator);
}
