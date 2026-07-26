import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties, IApiRouteMetadata, IApiRouteRuntimeProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";

import { EApiDtoType } from "@enum/decorator/api";
import { applyDecorators } from "@nestjs/common";
import { PARAMTYPES_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants.js";
import { RouteParamtypes } from "@nestjs/common/enums/route-paramtypes.enum.js";
import { ApiBody, ApiExtraModels } from "@nestjs/swagger";
import { ApiControllerGetDto } from "@utility/api/controller/get/dto.utility";
import { ApiRouteBuildDiscriminatedDtoOpenApiSchema, ApiRouteIsDiscriminatedDtoProperties } from "@utility/api/route/discriminator";
import { ApiRouteCollectDtoWithRegisteredChildren } from "@utility/api/route/dto-collect-with-registered-children.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";

type TApiRouteRequestDto = TApiRouteDiscriminatedDtoProperties | Type<unknown>;

/**
 * Applies request DTO metadata used by Nest Swagger for custom routes.
 * @template E - Entity type represented by the route metadata.
 * @param {object} target - Controller prototype that owns the custom route.
 * @param {string | symbol} propertyKey - Custom route method name.
 * @param {IApiRouteMetadata<E>} metadata - Route metadata used to resolve generated DTOs.
 * @param {IApiRouteRuntimeProperties<E, undefined>} runtimeProperties - Runtime route config containing dto/autoDto.
 * @param {PropertyDescriptor} descriptor - Custom route method descriptor.
 * @returns {void}
 */
export function ApiRouteApplyDtoMetadata<E extends IApiBaseEntity>(target: object, propertyKey: string | symbol, metadata: IApiRouteMetadata<E>, runtimeProperties: IApiRouteRuntimeProperties<E, undefined>, descriptor: PropertyDescriptor): void {
	const bodyDto: TApiRouteRequestDto | undefined = resolveRequestDto(metadata, runtimeProperties, EApiDtoType.BODY);
	const parametersDtoConfig: TApiRouteRequestDto | undefined = resolveRequestDto(metadata, runtimeProperties, EApiDtoType.PARAMETERS);
	const queryDtoConfig: TApiRouteRequestDto | undefined = resolveRequestDto(metadata, runtimeProperties, EApiDtoType.QUERY);
	const parametersDto: Type<unknown> | undefined = ApiRouteIsDiscriminatedDtoProperties(parametersDtoConfig) ? undefined : parametersDtoConfig;
	const queryDto: Type<unknown> | undefined = ApiRouteIsDiscriminatedDtoProperties(queryDtoConfig) ? undefined : queryDtoConfig;
	const routeArgumentsMetadata: Record<string, { data?: unknown; index?: number }> | undefined = Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, propertyKey) as Record<string, { data?: unknown; index?: number }> | undefined;
	const parameterTypes: Array<unknown> = [...((Reflect.getMetadata(PARAMTYPES_METADATA, target, propertyKey) as Array<unknown> | undefined) ?? [])];

	for (const { dto, parameterType } of [
		{ dto: ApiRouteIsDiscriminatedDtoProperties(bodyDto) ? Object : bodyDto, parameterType: RouteParamtypes.BODY },
		{ dto: parametersDto, parameterType: RouteParamtypes.PARAM },
		{ dto: queryDto, parameterType: RouteParamtypes.QUERY },
	]) {
		if (!dto) {
			continue;
		}

		const argumentIndex: number | undefined = resolveRouteArgumentIndex(routeArgumentsMetadata, parameterType);

		if (argumentIndex !== undefined) {
			parameterTypes[argumentIndex] = dto;
		}
	}

	if (parameterTypes.length > 0) {
		Reflect.defineMetadata(PARAMTYPES_METADATA, parameterTypes, target, propertyKey);
	}

	const requestDtos: Array<Type<unknown>> = [];

	for (const dto of [bodyDto, parametersDto, queryDto]) {
		if (ApiRouteIsDiscriminatedDtoProperties(dto)) {
			ApiRouteCollectDtoWithRegisteredChildren(requestDtos, dto.type);
		} else if (dto) {
			ApiRouteCollectDtoWithRegisteredChildren(requestDtos, dto);
		}
	}

	const swaggerDecorators: Array<MethodDecorator> = requestDtos.length > 0 ? [ApiExtraModels(...requestDtos)] : [];

	if (ApiRouteIsDiscriminatedDtoProperties(bodyDto)) {
		swaggerDecorators.push(
			ApiBody({
				schema: ApiRouteBuildDiscriminatedDtoOpenApiSchema(bodyDto, "ApiRouteCustom body"),
			}),
		);
	}

	if (swaggerDecorators.length > 0) {
		applyDecorators(...swaggerDecorators)(target, propertyKey, descriptor);
	}
}

/**
 * Resolves an explicitly configured request DTO or a generated DTO when the custom route has a CRUD route type.
 * @template E - Entity type represented by the route metadata.
 * @param {IApiRouteMetadata<E>} metadata - Route metadata used for entity and route type.
 * @param {IApiRouteRuntimeProperties<E, undefined>} runtimeProperties - Runtime route config containing dto/autoDto.
 * @param {Exclude<EApiDtoType, EApiDtoType.RESPONSE>} dtoType - Request DTO target.
 * @returns {TApiRouteRequestDto | undefined} Resolved request DTO.
 */
function resolveRequestDto<E extends IApiBaseEntity>(metadata: IApiRouteMetadata<E>, runtimeProperties: IApiRouteRuntimeProperties<E, undefined>, dtoType: Exclude<EApiDtoType, EApiDtoType.RESPONSE>): TApiRouteRequestDto | undefined {
	const configuredDto: TApiRouteRequestDto | undefined = runtimeProperties.dto?.[dtoType];

	if (configuredDto) {
		return configuredDto;
	}

	if (!metadata.route.type || !runtimeProperties.autoDto?.[dtoType]) {
		return undefined;
	}

	const entity: IApiEntity<E> = GenerateEntityInformation<E>(metadata.resource.entity);

	const controllerProperties: IApiControllerProperties<E> = {
		entity: metadata.resource.entity,
		routes: {},
	};

	const routeConfig: TApiControllerPropertiesRoute<E, typeof metadata.route.type> = {
		...runtimeProperties,
		security: metadata.security,
	} as TApiControllerPropertiesRoute<E, typeof metadata.route.type>;

	return ApiControllerGetDto(controllerProperties, entity, metadata.route.type, dtoType, routeConfig);
}

/**
 * Resolves an argument index from Nest route argument metadata.
 * @param {Record<string, { data?: unknown; index?: number }> | undefined} routeArgumentsMetadata - Nest route arguments metadata.
 * @param {RouteParamtypes} parameterType - Nest parameter type to find.
 * @returns {number | undefined} Whole-object argument index for the requested parameter type.
 */
function resolveRouteArgumentIndex(routeArgumentsMetadata: Record<string, { data?: unknown; index?: number }> | undefined, parameterType: RouteParamtypes): number | undefined {
	if (!routeArgumentsMetadata) {
		return undefined;
	}

	for (const entry of Object.entries(routeArgumentsMetadata)) {
		const [key, value]: [string, { data?: unknown; index?: number }] = entry;
		const [type]: Array<string> = key.split(":");
		const metadataParameterType: RouteParamtypes = Number(type);

		if (metadataParameterType === parameterType && value.data === undefined) {
			return value.index;
		}
	}

	return undefined;
}
