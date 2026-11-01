import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerTableInheritancePlan, IApiControllerTableInheritanceVariant } from "@interface/class/api/controller/table-inheritance";
import type { IApiControllerPropertiesRouteAutoDtoConfig } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TTypeDiscriminator } from "@type/decorator/api/property";
import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";
import type { ObjectLiteral } from "typeorm";

import { EApiControllerGetListQueryPaginationMode, EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { ApiControllerGetListQueryGetPaginationMode } from "@utility/api/controller/get-list/query/get-pagination-mode.utility";
import { ApiRouteResolveDiscriminatedDto, ApiRouteValidateDiscriminatedDtoProperties } from "@utility/api/route/discriminator";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { DtoGenerateCacheKey } from "@utility/dto/generate/cache-key.utility";
import { DtoGenerate } from "@utility/dto/generate/core.utility";
import { DtoGenerateGetListItemsResponse } from "@utility/dto/generate/get-list";
import { ErrorException } from "@utility/error/exception.utility";
import { Transform } from "class-transformer";

const tableInheritanceResponseCache: Map<string, TApiRouteDiscriminatedDtoProperties | Type<unknown>> = new Map<string, TApiRouteDiscriminatedDtoProperties | Type<unknown>>();

/**
 * Generates the polymorphic GET or GET_LIST response of a table inheritance root.
 * GET resolves to the discriminated variant DTOs; GET_LIST resolves to a list wrapper over them.
 * @template E - The root entity type.
 * @param {ObjectLiteral} entity - The root entity class.
 * @param {IApiEntity<E>} entityMetadata - The root entity metadata.
 * @param {IApiControllerTableInheritancePlan} plan - Compiled variants of the root.
 * @param {EApiRouteType} method - GET or GET_LIST route type.
 * @param {IApiControllerPropertiesRouteAutoDtoConfig} [dtoConfig] - Optional automatic DTO configuration.
 * @param {Type<CanActivate>} [currentGuard] - Optional authentication guard for property visibility control.
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Compiled plan selecting the list envelope.
 * @returns {TApiRouteDiscriminatedDtoProperties | Type<unknown>} Discriminated variants for GET or the list wrapper for GET_LIST.
 */
export function DtoGenerateTableInheritanceResponse<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, plan: IApiControllerTableInheritancePlan, method: EApiRouteType, dtoConfig?: IApiControllerPropertiesRouteAutoDtoConfig, currentGuard?: Type<CanActivate>, queryPlan?: IApiControllerGetListQueryPlan): TApiRouteDiscriminatedDtoProperties | Type<unknown> {
	const isCursor: boolean = method === EApiRouteType.GET_LIST && ApiControllerGetListQueryGetPaginationMode(queryPlan) === EApiControllerGetListQueryPaginationMode.CURSOR;

	const cacheKey: string = DtoGenerateCacheKey({
		dtoConfig,
		dtoType: EApiDtoType.RESPONSE,
		entityName: String(entityMetadata.name),
		guardName: currentGuard?.name,
		method,
		queryPlanSignature: isCursor ? EApiControllerGetListQueryPaginationMode.CURSOR : undefined,
		responseVariantName: plan.variants.map(({ discriminatorValue, entityMetadata: { name } }: IApiControllerTableInheritanceVariant): string => `${discriminatorValue}:${String(name)}`).join(","),
	});
	const cached: TApiRouteDiscriminatedDtoProperties | Type<unknown> | undefined = tableInheritanceResponseCache.get(cacheKey);

	if (cached) {
		return cached;
	}

	const variantNamePrefix: string = `${entityMetadata.name ?? "UnknownResource"}${CamelCaseString(method)}${CamelCaseString(EApiDtoType.RESPONSE)}`;
	const mapping: Record<string, Type<unknown>> = {};

	for (const variant of plan.variants) {
		const variantDto: Type<unknown> | undefined = DtoGenerate(variant.entity, variant.entityMetadata, method, EApiDtoType.RESPONSE, dtoConfig, currentGuard, undefined, `${variantNamePrefix}${CamelCaseString(variant.discriminatorValue)}DTO`);

		if (!variantDto) {
			throw ErrorException(`Response DTO for table inheritance variant ${String(variant.entityMetadata.name)} was not generated`);
		}

		mapping[variant.discriminatorValue] = variantDto;
	}

	const discriminator: TTypeDiscriminator = { mapping, propertyName: plan.discriminatorPropertyName, shouldKeepDiscriminatorProperty: true };
	const discriminatedResponse: TApiRouteDiscriminatedDtoProperties = { discriminator, type: Object.values(mapping) };

	ApiRouteValidateDiscriminatedDtoProperties(discriminatedResponse, `Table inheritance root ${String(entityMetadata.name)} response`);

	if (method !== EApiRouteType.GET_LIST) {
		tableInheritanceResponseCache.set(cacheKey, discriminatedResponse);

		return discriminatedResponse;
	}

	const listResponse: Type<unknown> = DtoGenerateGetListItemsResponse(entity, entityMetadata, discriminatedResponse.type, queryPlan, discriminator);

	// class-transformer falls back to a plain object for an unmapped subtype, so each row is resolved first to fail closed.
	Transform(
		({ key, obj, value }: { key: string; obj: Record<string, ReadonlyArray<unknown>>; value: unknown }): unknown => {
			for (const item of obj[key] ?? []) {
				ApiRouteResolveDiscriminatedDto(discriminatedResponse, item, "Table inheritance list response");
			}

			return value;
		},
		{ toClassOnly: true },
	)(listResponse.prototype as object, "items");
	tableInheritanceResponseCache.set(cacheKey, listResponse);

	return listResponse;
}
