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
import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";
import type { ObjectLiteral } from "typeorm";

import { EApiControllerGetListQueryPaginationMode, EApiDtoType as EApiDtoTypeValue, EApiRouteType as EApiRouteTypeValue } from "@enum/decorator/api";
import { ApiControllerGetListQueryGetPaginationMode } from "@utility/api/controller/get-list/query/get-pagination-mode.utility";
import { ApiControllerIdentityPlanAssert } from "@utility/api/controller/identity";
import { ApiControllerReadPlanAssert } from "@utility/api/controller/read";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { DtoGenerate, DtoGenerateGetListResponse } from "@utility/dto";
import { DtoGenerateGetListCursorResponse } from "@utility/dto/generate/get-list";
import { DtoGenerateIdentityReadParameters } from "@utility/dto/generate/identity-read-parameters.utility";
import { DtoGenerateReadParameters } from "@utility/dto/generate/read-parameters.utility";
import { DtoGenerateTableInheritanceResponse } from "@utility/dto/generate/table-inheritance-response.utility";
import { ErrorException } from "@utility/error/exception.utility";

const getListItemResponseDtoCache: WeakMap<object, WeakMap<object, Map<string, Type<unknown>>>> = new WeakMap<object, WeakMap<object, Map<string, Type<unknown>>>>();
const getListItemResponseDtoNameOwnerCache: WeakMap<object, Map<string, object>> = new WeakMap<object, Map<string, object>>();
const getListItemResponseDtoNameModeCache: WeakMap<object, Map<string, EApiControllerGetListQueryPaginationMode>> = new WeakMap<object, Map<string, EApiControllerGetListQueryPaginationMode>>();

/**
 * Resolves a DTO class for a generated controller route.
 * Prefers an explicitly configured DTO and falls back to auto-generation.
 * @param {IApiControllerProperties<E>} properties - Controller configuration
 * @param {IApiEntity<E>} entity - Entity metadata
 * @param {R} method - Route type
 * @param {EApiDtoType} dtoType - DTO kind to resolve
 * @param {TApiControllerPropertiesRoute<E, R>} routeConfig - Route-specific configuration
 * @param {string} schemaPrefix - Schema prefix of the controller that owns the route, from `ApiControllerGetSchemaPrefix`; it starts every generated DTO name
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Route-scoped plan for dynamic GET_LIST QUERY DTO generation.
 * @returns {Type<unknown> | undefined} -The resolved DTO class or undefined if no DTO is configured
 * @template E - Entity type
 * @template R - Route type
 */
export function ApiControllerGetDto<E extends IApiBaseEntity, R extends EApiRouteType>(properties: IApiControllerProperties<E>, entity: IApiEntity<E>, method: R, dtoType: EApiDtoType, routeConfig: TApiControllerPropertiesRoute<E, R>, schemaPrefix: string, queryPlan?: IApiControllerGetListQueryPlan): Type<unknown> | undefined {
	ApiControllerReadPlanAssert(routeConfig);

	return ApiControllerGetDtoWithReadPlan(properties, entity, method, dtoType, routeConfig, schemaPrefix, queryPlan);
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
 * @param {string} schemaPrefix - Schema prefix of the controller that owns the route, from `ApiControllerGetSchemaPrefix`; it starts every generated DTO name
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Route-scoped GET_LIST QUERY plan.
 * @param {IApiControllerReadPlan} [readPlan] - Internal route-scoped PARAMETERS plan.
 * @param {IApiControllerIdentityPlan} [identityPlan] - Internal GET identity alias plan.
 * @param {string} [routeName] - PascalCase handler method name of a custom route; it replaces the route type in generated DTO names.
 * @returns {Type<unknown> | undefined} Resolved DTO class or undefined.
 */
export function ApiControllerGetDtoWithReadPlan<E extends IApiBaseEntity, R extends EApiRouteType>(properties: IApiControllerProperties<E>, entity: IApiEntity<E>, method: R, dtoType: EApiDtoType, routeConfig: TApiControllerPropertiesRoute<E, R>, schemaPrefix: string, queryPlan?: IApiControllerGetListQueryPlan, readPlan?: IApiControllerReadPlan, identityPlan?: IApiControllerIdentityPlan, routeName?: string): Type<unknown> | undefined {
	ApiControllerIdentityPlanAssert(routeConfig, identityPlan);

	if (dtoType === EApiDtoTypeValue.PARAMETERS) {
		ApiControllerReadPlanAssert(routeConfig, readPlan);
	}

	const configuredDto: IApiControllerPropertiesRouteGetListResponseDtoConfig | Type<unknown> | undefined = routeConfig.dto?.[dtoType];

	if (configuredDto) {
		if (!isGetListResponseDtoConfig(configuredDto)) {
			return configuredDto;
		}

		if (method !== EApiRouteTypeValue.GET_LIST || dtoType !== EApiDtoTypeValue.RESPONSE) {
			throw ErrorException("Custom item response DTO configuration is supported only for the GET_LIST RESPONSE DTO");
		}

		return getGetListItemResponseDto(properties.entity, configuredDto, method, dtoType, schemaPrefix, queryPlan);
	}

	if (dtoType === EApiDtoTypeValue.PARAMETERS) {
		if (identityPlan) {
			return DtoGenerateIdentityReadParameters(entity, identityPlan, schemaPrefix, readPlan, routeConfig.autoDto?.[dtoType], routeConfig.security?.authentication?.guard);
		}

		if (readPlan) {
			return DtoGenerateReadParameters(entity, method, readPlan, routeConfig.autoDto?.[dtoType], routeConfig.security?.authentication?.guard);
		}
	}

	const isCursorGetListResponse: boolean = method === EApiRouteTypeValue.GET_LIST && dtoType === EApiDtoTypeValue.RESPONSE && ApiControllerGetListQueryGetPaginationMode(queryPlan) === EApiControllerGetListQueryPaginationMode.CURSOR;
	const effectiveQueryPlan: IApiControllerGetListQueryPlan | undefined = method === EApiRouteTypeValue.GET_LIST && (dtoType === EApiDtoTypeValue.QUERY || isCursorGetListResponse) ? queryPlan : undefined;
	// A manual list response limits ordering to the item properties it publishes.
	const listResponseDto: Type<unknown> | undefined = method === EApiRouteTypeValue.GET_LIST && dtoType === EApiDtoTypeValue.QUERY && routeConfig.dto?.[EApiDtoTypeValue.RESPONSE] ? ApiControllerGetDtoWithReadPlan(properties, entity, method, EApiDtoTypeValue.RESPONSE, routeConfig, schemaPrefix, queryPlan) : undefined;

	return DtoGenerate(properties.entity, entity, method, dtoType, schemaPrefix, routeConfig.autoDto?.[dtoType], routeConfig.security?.authentication?.guard, effectiveQueryPlan, undefined, routeName, listResponseDto);
}

/**
 * Resolves the response DTO of a generated route, including polymorphic table inheritance reads.
 * @template E - Entity type
 * @template R - Route type
 * @param {IApiControllerProperties<E>} properties - Controller properties
 * @param {IApiEntity<E>} entity - Entity metadata
 * @param {R} method - Route method
 * @param {TApiControllerPropertiesRoute<E, R>} routeConfig - Route-specific configuration
 * @param {string} schemaPrefix - Schema prefix of the controller that owns the route, from `ApiControllerGetSchemaPrefix`; it starts every generated DTO name
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Route-scoped GET_LIST plan.
 * @param {IApiControllerIdentityPlan} [identityPlan] - Internal GET identity alias plan.
 * @returns {TApiRouteDiscriminatedDtoProperties | Type<unknown> | undefined} Response DTO, discriminated variants, or undefined.
 */
export function ApiControllerGetResponseDto<E extends IApiBaseEntity, R extends EApiRouteType>(properties: IApiControllerProperties<E>, entity: IApiEntity<E>, method: R, routeConfig: TApiControllerPropertiesRoute<E, R>, schemaPrefix: string, queryPlan?: IApiControllerGetListQueryPlan, identityPlan?: IApiControllerIdentityPlan): TApiRouteDiscriminatedDtoProperties | Type<unknown> | undefined {
	const isPolymorphicRead: boolean = (method === EApiRouteTypeValue.GET || method === EApiRouteTypeValue.GET_LIST) && !routeConfig.dto?.[EApiDtoTypeValue.RESPONSE];

	if (isPolymorphicRead && entity.tableInheritance?.variants.length) {
		ApiControllerIdentityPlanAssert(routeConfig, identityPlan);

		return DtoGenerateTableInheritanceResponse(properties.entity, entity, entity.tableInheritance, method, schemaPrefix, routeConfig.autoDto?.[EApiDtoTypeValue.RESPONSE], routeConfig.security?.authentication?.guard, queryPlan);
	}

	return ApiControllerGetDtoWithReadPlan(properties, entity, method, EApiDtoTypeValue.RESPONSE, routeConfig, schemaPrefix, queryPlan, undefined, identityPlan);
}

/**
 * Builds a stable generated wrapper class name for GET_LIST custom item response DTOs.
 * @param {IApiControllerPropertiesRouteGetListResponseDtoConfig} config - Custom item response DTO config.
 * @param {EApiRouteType} method - Current route type.
 * @param {EApiDtoType} dtoType - Current DTO type.
 * @param {string} schemaPrefix - Schema prefix of the controller that owns the route, from `ApiControllerGetSchemaPrefix`; it starts every generated DTO name
 * @returns {string} Generated wrapper DTO class name.
 */
function buildGetListItemResponseDtoName(config: IApiControllerPropertiesRouteGetListResponseDtoConfig, method: EApiRouteType, dtoType: EApiDtoType, schemaPrefix: string): string {
	return config.name ?? `${schemaPrefix}${CamelCaseString(method)}${CamelCaseString(dtoType)}${config.itemType.name}`;
}

/**
 * Generates or returns a cached list wrapper around a configured custom item response DTO.
 * @param {ObjectLiteral} resourceClass - Entity class used for wrapper metadata.
 * @param {IApiControllerPropertiesRouteGetListResponseDtoConfig} config - Custom item response DTO config.
 * @param {EApiRouteType} method - Current route type.
 * @param {EApiDtoType} dtoType - Current DTO type.
 * @param {string} schemaPrefix - Schema prefix of the controller that owns the route, from `ApiControllerGetSchemaPrefix`; it starts every generated DTO name
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Compiled pagination plan selecting the page or cursor wrapper.
 * @returns {Type<unknown>} Generated list wrapper DTO class.
 */
function getGetListItemResponseDto(resourceClass: ObjectLiteral, config: IApiControllerPropertiesRouteGetListResponseDtoConfig, method: EApiRouteType, dtoType: EApiDtoType, schemaPrefix: string, queryPlan?: IApiControllerGetListQueryPlan): Type<unknown> {
	const paginationMode: EApiControllerGetListQueryPaginationMode = ApiControllerGetListQueryGetPaginationMode(queryPlan);
	const isCursor: boolean = paginationMode === EApiControllerGetListQueryPaginationMode.CURSOR;
	const defaultName: string = buildGetListItemResponseDtoName(config, method, dtoType, schemaPrefix);
	const name: string = isCursor ? (config.name ?? `${defaultName}Cursor`) : defaultName;
	let nameOwnerCache: Map<string, object> | undefined = getListItemResponseDtoNameOwnerCache.get(resourceClass);

	if (!nameOwnerCache) {
		nameOwnerCache = new Map<string, object>();
		getListItemResponseDtoNameOwnerCache.set(resourceClass, nameOwnerCache);
	}

	let nameModeCache: Map<string, EApiControllerGetListQueryPaginationMode> | undefined = getListItemResponseDtoNameModeCache.get(resourceClass);

	if (!nameModeCache) {
		nameModeCache = new Map<string, EApiControllerGetListQueryPaginationMode>();
		getListItemResponseDtoNameModeCache.set(resourceClass, nameModeCache);
	}

	const currentNameOwner: object | undefined = nameOwnerCache.get(name);
	const currentNameMode: EApiControllerGetListQueryPaginationMode | undefined = nameModeCache.get(name);

	if ((currentNameOwner && currentNameOwner !== config.itemType) || (currentNameMode && currentNameMode !== paginationMode)) {
		throw ErrorException(`GET_LIST item response DTO wrapper name "${name}" is already used by another item constructor or pagination mode; configure a unique response DTO name`);
	}

	nameOwnerCache.set(name, config.itemType);
	nameModeCache.set(name, paginationMode);
	let resourceCache: undefined | WeakMap<object, Map<string, Type<unknown>>> = getListItemResponseDtoCache.get(resourceClass);

	if (!resourceCache) {
		resourceCache = new WeakMap<object, Map<string, Type<unknown>>>();
		getListItemResponseDtoCache.set(resourceClass, resourceCache);
	}

	let itemCache: Map<string, Type<unknown>> | undefined = resourceCache.get(config.itemType);

	if (!itemCache) {
		itemCache = new Map<string, Type<unknown>>();
		resourceCache.set(config.itemType, itemCache);
	}

	const cached: Type<unknown> | undefined = itemCache.get(name);

	if (cached) {
		return cached;
	}

	// @ts-ignore The existing list wrapper generators accept the entity constructor at runtime.
	const dto: Type<unknown> = isCursor ? DtoGenerateGetListCursorResponse(resourceClass, config.itemType, name, `the getList cursor response of controller prefix "${schemaPrefix}"`) : DtoGenerateGetListResponse(resourceClass, config.itemType, name, `the getList page response of controller prefix "${schemaPrefix}"`);
	itemCache.set(name, dto);

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
