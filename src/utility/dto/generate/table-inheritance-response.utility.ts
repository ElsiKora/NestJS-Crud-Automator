import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerTableInheritancePlan, IApiControllerTableInheritanceVariant } from "@interface/class/api/controller/table-inheritance";
import type { IApiControllerPropertiesRouteAutoDtoConfig, IApiControllerPropertiesRouteBaseRelationsResponse } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TTypeDiscriminator } from "@type/decorator/api/property";
import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";
import type { ObjectLiteral } from "typeorm";

import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { EApiControllerGetListQueryPaginationMode, EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { ApiControllerGetListQueryGetPaginationMode } from "@utility/api/controller/get-list/query/get-pagination-mode.utility";
import { ApiRouteResolveDiscriminatedDto, ApiRouteValidateDiscriminatedDtoProperties } from "@utility/api/route/discriminator";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { DtoGenerateCacheClassIdentifier } from "@utility/dto/generate/cache-class-identifier.utility";
import { DtoGenerateCacheKey } from "@utility/dto/generate/cache-key.utility";
import { DtoGenerate } from "@utility/dto/generate/core.utility";
import { DtoGenerateGetListItemsResponse } from "@utility/dto/generate/get-list";
import { DtoSchemaNameStripSuffix } from "@utility/dto/schema-name/strip-suffix.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { ResolveMetadataTarget } from "@utility/resolve/metadata-target.utility";
import { Transform } from "class-transformer";

// Keyed by root entity class, so a re-evaluated entity module generates its responses again.
const tableInheritanceResponseCache: WeakMap<ObjectLiteral, Map<string, TApiRouteDiscriminatedDtoProperties | Type<unknown>>> = new WeakMap<ObjectLiteral, Map<string, TApiRouteDiscriminatedDtoProperties | Type<unknown>>>();

/**
 * Generates the polymorphic GET or GET_LIST response of a table inheritance root.
 * GET resolves to the discriminated variant DTOs; GET_LIST resolves to a list wrapper over them.
 * @template E - The root entity type.
 * @param {ObjectLiteral} entity - The root entity class.
 * @param {IApiEntity<E>} entityMetadata - The root entity metadata.
 * @param {IApiControllerTableInheritancePlan} plan - Compiled variants of the root.
 * @param {EApiRouteType} method - GET or GET_LIST route type.
 * @param {string} schemaPrefix - Schema prefix of the controller that owns the route, from `ApiControllerGetSchemaPrefix`; it starts every generated DTO name
 * @param {IApiControllerPropertiesRouteAutoDtoConfig} [dtoConfig] - Optional automatic DTO configuration.
 * @param {Type<CanActivate>} [currentGuard] - Optional authentication guard for property visibility control.
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Compiled plan selecting the list envelope.
 * @param {IApiControllerPropertiesRouteBaseRelationsResponse<E>} [responseRelations] - Response relation config of the route, which shapes the relation properties of each variant.
 * @returns {TApiRouteDiscriminatedDtoProperties | Type<unknown>} Discriminated variants for GET or the list wrapper for GET_LIST.
 */
export function DtoGenerateTableInheritanceResponse<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, plan: IApiControllerTableInheritancePlan, method: EApiRouteType, schemaPrefix: string, dtoConfig?: IApiControllerPropertiesRouteAutoDtoConfig, currentGuard?: Type<CanActivate>, queryPlan?: IApiControllerGetListQueryPlan, responseRelations?: IApiControllerPropertiesRouteBaseRelationsResponse<E>): TApiRouteDiscriminatedDtoProperties | Type<unknown> {
	const isCursor: boolean = method === EApiRouteType.GET_LIST && ApiControllerGetListQueryGetPaginationMode(queryPlan) === EApiControllerGetListQueryPaginationMode.CURSOR;

	const cacheKey: string = DtoGenerateCacheKey({
		controllerName: schemaPrefix,
		dtoConfig,
		dtoType: EApiDtoType.RESPONSE,
		entity: ResolveMetadataTarget(entity),
		guard: currentGuard,
		method,
		queryPlanSignature: isCursor ? EApiControllerGetListQueryPaginationMode.CURSOR : undefined,
		responseRelations,
		responseVariantName: plan.variants.map(({ discriminatorValue, entity: variantEntity }: IApiControllerTableInheritanceVariant): string => `${discriminatorValue}:${DtoGenerateCacheClassIdentifier(variantEntity as { name: string } & object)}`).join(","),
	});
	const entityResponseCache: Map<string, TApiRouteDiscriminatedDtoProperties | Type<unknown>> = tableInheritanceResponseCache.get(entity) ?? new Map<string, TApiRouteDiscriminatedDtoProperties | Type<unknown>>();

	tableInheritanceResponseCache.set(entity, entityResponseCache);

	const cached: TApiRouteDiscriminatedDtoProperties | Type<unknown> | undefined = entityResponseCache.get(cacheKey);

	if (cached) {
		return cached;
	}

	const variantNamePrefix: string = `${schemaPrefix}${CamelCaseString(method)}${CamelCaseString(EApiDtoType.RESPONSE)}`;

	const mappingEntries: Array<[string, Type<unknown>]> = plan.variants.map((variant: IApiControllerTableInheritanceVariant): [string, Type<unknown>] => {
		const variantDto: Type<unknown> | undefined = DtoGenerate(variant.entity, variant.entityMetadata, method, EApiDtoType.RESPONSE, schemaPrefix, dtoConfig, currentGuard, undefined, `${variantNamePrefix}${DtoSchemaNameStripSuffix(CamelCaseString(variant.discriminatorValue))}DTO`, undefined, undefined, responseRelations);

		if (!variantDto) {
			throw ErrorException(`Response DTO for table inheritance variant ${String(variant.entityMetadata.name)} was not generated`);
		}

		if (!Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, variantDto.prototype as object, plan.discriminatorPropertyName)) {
			throw ErrorException(`Table inheritance root ${String(entityMetadata.name)} must expose its discriminator column "${plan.discriminatorPropertyName}" in GET and GET_LIST responses`);
		}

		return [variant.discriminatorValue, variantDto];
	});
	// Object.fromEntries defines own properties, so a value such as "__proto__" stays a mapping key.
	const mapping: Record<string, Type<unknown>> = Object.fromEntries(mappingEntries);

	const discriminator: TTypeDiscriminator = { mapping, propertyName: plan.discriminatorPropertyName, shouldKeepDiscriminatorProperty: true };
	const discriminatedResponse: TApiRouteDiscriminatedDtoProperties = { discriminator, type: mappingEntries.map(([, variantDto]: [string, Type<unknown>]): Type<unknown> => variantDto) };

	ApiRouteValidateDiscriminatedDtoProperties(discriminatedResponse, `Table inheritance root ${String(entityMetadata.name)} response`);

	if (method !== EApiRouteType.GET_LIST) {
		entityResponseCache.set(cacheKey, discriminatedResponse);

		return discriminatedResponse;
	}

	const listResponse: Type<unknown> = DtoGenerateGetListItemsResponse(entity, discriminatedResponse, schemaPrefix, queryPlan);

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
	entityResponseCache.set(cacheKey, listResponse);

	return listResponse;
}
