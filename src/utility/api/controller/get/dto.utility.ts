import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";
import type { IApiControllerReadPlan } from "@interface/class/api/controller/read";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiControllerPropertiesRouteGetListResponseDtoConfig } from "@interface/decorator/api/controller/properties/route";
import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { ObjectLiteral } from "typeorm";

import { EApiDtoType as EApiDtoTypeValue, EApiRouteType as EApiRouteTypeValue } from "@enum/decorator/api";
import { ApiControllerIdentityPlanAssert } from "@utility/api/controller/identity";
import { ApiControllerReadPlanAssert } from "@utility/api/controller/read";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { DtoGenerate, DtoGenerateGetListResponse } from "@utility/dto";
import { DtoGenerateIdentityReadParameters } from "@utility/dto/generate/identity-read-parameters.utility";
import { DtoGenerateReadParameters } from "@utility/dto/generate/read-parameters.utility";

const getListItemResponseDtoCache: Map<string, Type<unknown>> = new Map<string, Type<unknown>>();

/**
 * Resolves a DTO class for a generated controller route.
 * Prefers an explicitly configured DTO and falls back to auto-generation.
 * @param {IApiControllerProperties<E>} properties - Controller configuration
 * @param {IApiEntity<E>} entity - Entity metadata
 * @param {R} method - Route type
 * @param {EApiDtoType} dtoType - DTO kind to resolve
 * @param {TApiControllerPropertiesRoute<E, R>} routeConfig - Route-specific configuration
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Route-scoped plan for dynamic GET_LIST QUERY DTO generation.
 * @returns {Type<unknown> | undefined} -The resolved DTO class or undefined if no DTO is configured
 * @template E - Entity type
 * @template R - Route type
 */
export function ApiControllerGetDto<E extends IApiBaseEntity, R extends EApiRouteType>(properties: IApiControllerProperties<E>, entity: IApiEntity<E>, method: R, dtoType: EApiDtoType, routeConfig: TApiControllerPropertiesRoute<E, R>, queryPlan?: IApiControllerGetListQueryPlan): Type<unknown> | undefined {
	ApiControllerReadPlanAssert(routeConfig);

	return ApiControllerGetDtoWithReadPlan(properties, entity, method, dtoType, routeConfig, queryPlan);
}

/**
 * Resolves a route DTO while applying an internal compiled read plan.
 * @template E - Entity type
 * @template R - Route type
 * @param {IApiControllerProperties<E>} properties - Controller properties
 * @param {IApiEntity<E>} entity - Entity metadata
 * @param {R} method - Route method
 * @param {EApiDtoType} dtoType - DTO kind to resolve
 * @param {TApiControllerPropertiesRoute<E, R>} routeConfig - Route-specific configuration
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Route-scoped GET_LIST QUERY plan.
 * @param {IApiControllerReadPlan} [readPlan] - Internal route-scoped PARAMETERS plan.
 * @param {IApiControllerIdentityPlan} [identityPlan] - Internal GET identity alias plan.
 * @returns {Type<unknown> | undefined} Resolved DTO class or undefined.
 */
export function ApiControllerGetDtoWithReadPlan<E extends IApiBaseEntity, R extends EApiRouteType>(properties: IApiControllerProperties<E>, entity: IApiEntity<E>, method: R, dtoType: EApiDtoType, routeConfig: TApiControllerPropertiesRoute<E, R>, queryPlan?: IApiControllerGetListQueryPlan, readPlan?: IApiControllerReadPlan, identityPlan?: IApiControllerIdentityPlan): Type<unknown> | undefined {
	ApiControllerIdentityPlanAssert(routeConfig, identityPlan);

	if (dtoType === EApiDtoTypeValue.PARAMETERS) {
		ApiControllerReadPlanAssert(routeConfig, readPlan);
	}

	const configuredDto: IApiControllerPropertiesRouteGetListResponseDtoConfig | Type<unknown> | undefined = routeConfig.dto?.[dtoType];

	if (configuredDto) {
		if (method === EApiRouteTypeValue.GET_LIST && dtoType === EApiDtoTypeValue.RESPONSE && isGetListResponseDtoConfig(configuredDto)) {
			return getGetListItemResponseDto(properties.entity, entity, configuredDto, method, dtoType);
		}

		return configuredDto as Type<unknown>;
	}

	if (dtoType === EApiDtoTypeValue.PARAMETERS) {
		if (identityPlan) {
			return DtoGenerateIdentityReadParameters(entity, identityPlan, readPlan, routeConfig.autoDto?.[dtoType], routeConfig.security?.authentication?.guard);
		}

		if (readPlan) {
			return DtoGenerateReadParameters(entity, method, readPlan, routeConfig.autoDto?.[dtoType], routeConfig.security?.authentication?.guard);
		}
	}

	const effectiveQueryPlan: IApiControllerGetListQueryPlan | undefined = method === EApiRouteTypeValue.GET_LIST && dtoType === EApiDtoTypeValue.QUERY ? queryPlan : undefined;

	return DtoGenerate(properties.entity, entity, method, dtoType, routeConfig.autoDto?.[dtoType], routeConfig.security?.authentication?.guard, effectiveQueryPlan);
}

/**
 * Builds a stable generated wrapper class name for GET_LIST custom item response DTOs.
 * @param {IApiEntity<E>} entity - Entity metadata used for the resource name.
 * @param {IApiControllerPropertiesRouteGetListResponseDtoConfig} config - Custom item response DTO config.
 * @param {EApiRouteType} method - Current route type.
 * @param {EApiDtoType} dtoType - Current DTO type.
 * @returns {string} Generated wrapper DTO class name.
 * @template E - Entity type.
 */
function buildGetListItemResponseDtoName<E extends IApiBaseEntity>(entity: IApiEntity<E>, config: IApiControllerPropertiesRouteGetListResponseDtoConfig, method: EApiRouteType, dtoType: EApiDtoType): string {
	return config.name ?? `${entity.name ?? "UnknownResource"}${CamelCaseString(method)}${CamelCaseString(dtoType)}${config.itemType.name}`;
}

/**
 * Generates or returns a cached list wrapper around a configured custom item response DTO.
 * @param {ObjectLiteral} resourceClass - Entity class used for wrapper metadata.
 * @param {IApiEntity<E>} entity - Entity metadata used for naming.
 * @param {IApiControllerPropertiesRouteGetListResponseDtoConfig} config - Custom item response DTO config.
 * @param {EApiRouteType} method - Current route type.
 * @param {EApiDtoType} dtoType - Current DTO type.
 * @returns {Type<unknown>} Generated list wrapper DTO class.
 * @template E - Entity type.
 */
function getGetListItemResponseDto<E extends IApiBaseEntity>(resourceClass: ObjectLiteral, entity: IApiEntity<E>, config: IApiControllerPropertiesRouteGetListResponseDtoConfig, method: EApiRouteType, dtoType: EApiDtoType): Type<unknown> {
	const name: string = buildGetListItemResponseDtoName(entity, config, method, dtoType);
	const cacheKey: string = `${entity.name ?? "UnknownResource"}_${config.itemType.name}_${name}`;
	const cached: Type<unknown> | undefined = getListItemResponseDtoCache.get(cacheKey);

	if (cached) {
		return cached;
	}

	// @ts-ignore The existing list wrapper generator accepts the entity constructor at runtime.
	const dto: Type<unknown> = DtoGenerateGetListResponse(resourceClass, config.itemType, name);
	getListItemResponseDtoCache.set(cacheKey, dto);

	return dto;
}

/**
 * Returns whether a route response DTO config describes a custom GET_LIST item DTO.
 * @param {IApiControllerPropertiesRouteGetListResponseDtoConfig | Type<unknown>} value - Configured response DTO value.
 * @returns {boolean} Whether the value is the item DTO config shape.
 */
function isGetListResponseDtoConfig(value: IApiControllerPropertiesRouteGetListResponseDtoConfig | Type<unknown>): value is IApiControllerPropertiesRouteGetListResponseDtoConfig {
	return typeof value === "object" && "itemType" in value && typeof value.itemType === "function";
}
