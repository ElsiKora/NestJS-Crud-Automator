import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";
import type { IApiControllerReadPlan } from "@interface/class/api/controller/read";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";

import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { EApiDtoType } from "@enum/decorator/api";
import { ApiControllerGetDtoWithReadPlan, ApiControllerGetResponseDto } from "@utility/api/controller/get/dto.utility";
import { ApiControllerGetSchemaPrefix } from "@utility/api/controller/get/schema-prefix.utility";
import { ApiRouteIsDiscriminatedDtoProperties } from "@utility/api/route/discriminator";
import { DtoSchemaNameGetRouteOrigin, DtoSchemaNameRegisterClasses } from "@utility/dto/schema-name";
import { GetRegisteredAutoDtoChildrenRecursive } from "@utility/register-auto-dto-child.utility";

/**
 * Generates and registers Swagger documentation for DTOs.
 * Creates or uses existing DTOs for request, query, body, and response,
 * and ensures they're properly registered with Swagger for API documentation.
 * @param {object} target - The target controller class
 * @param {IApiEntity<E>} entity - The entity definition
 * @param {IApiControllerProperties<E>} properties - Controller configuration properties
 * @param {EApiRouteType} method - The type of route (CREATE, DELETE, GET, etc.)
 * @param {TApiControllerPropertiesRoute<E, typeof method>} routeConfig - Route-specific configuration
 * @param {IApiEntity<E>} _entityMetadata - Unused; kept so existing callers keep their argument order.
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Route-scoped plan used by dynamic QUERY DTO generation.
 * @returns {void}
 * @template E - The entity type
 */
export function ApiControllerWriteDtoSwagger<E extends IApiBaseEntity>(target: object, entity: IApiEntity<E>, properties: IApiControllerProperties<E>, method: EApiRouteType, routeConfig: TApiControllerPropertiesRoute<E, typeof method>, _entityMetadata: IApiEntity<E>, queryPlan?: IApiControllerGetListQueryPlan): void {
	ApiControllerWriteDtoSwaggerWithReadPlan(target, entity, properties, method, routeConfig, queryPlan);
}

/**
 * Registers generated DTOs and Swagger parameters with an internal compiled read plan.
 * @template E - Entity type
 * @param {object} target - Controller class.
 * @param {IApiEntity<E>} entity - Entity metadata.
 * @param {IApiControllerProperties<E>} properties - Controller configuration.
 * @param {EApiRouteType} method - Generated route type.
 * @param {TApiControllerPropertiesRoute<E, typeof method>} routeConfig - Route configuration.
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Internal compiled QUERY plan.
 * @param {IApiControllerReadPlan} [readPlan] - Internal compiled PARAMETERS plan.
 * @param {IApiControllerIdentityPlan} [identityPlan] - Internal GET identity alias plan.
 * @returns {void}
 */
export function ApiControllerWriteDtoSwaggerWithReadPlan<E extends IApiBaseEntity>(target: object, entity: IApiEntity<E>, properties: IApiControllerProperties<E>, method: EApiRouteType, routeConfig: TApiControllerPropertiesRoute<E, typeof method>, queryPlan?: IApiControllerGetListQueryPlan, readPlan?: IApiControllerReadPlan, identityPlan?: IApiControllerIdentityPlan): void {
	const schemaPrefix: string = ApiControllerGetSchemaPrefix(target);
	const swaggerModels: Array<unknown> = (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.EXTRA_MODELS, target) ?? []) as Array<unknown>;
	const requestDto: Type<unknown> | undefined = ApiControllerGetDtoWithReadPlan(properties, entity, method, EApiDtoType.PARAMETERS, routeConfig, schemaPrefix, queryPlan, readPlan, identityPlan);
	const queryDto: Type<unknown> | undefined = ApiControllerGetDtoWithReadPlan(properties, entity, method, EApiDtoType.QUERY, routeConfig, schemaPrefix, queryPlan, readPlan, identityPlan);
	const bodyDto: Type<unknown> | undefined = ApiControllerGetDtoWithReadPlan(properties, entity, method, EApiDtoType.BODY, routeConfig, schemaPrefix, queryPlan, readPlan, identityPlan);
	const responseDto: TApiRouteDiscriminatedDtoProperties | Type<unknown> | undefined = ApiControllerGetResponseDto(properties, entity, method, routeConfig, schemaPrefix, queryPlan, identityPlan);

	const dtoList: Array<Type<unknown> | undefined> = [requestDto, queryDto, bodyDto, ...(ApiRouteIsDiscriminatedDtoProperties(responseDto) ? [] : [responseDto])];
	const responseOrigin: string = DtoSchemaNameGetRouteOrigin(schemaPrefix, method, EApiDtoType.RESPONSE);

	for (const [dtoType, dto] of [
		[EApiDtoType.PARAMETERS, requestDto],
		[EApiDtoType.QUERY, queryDto],
		[EApiDtoType.BODY, bodyDto],
	] as const) {
		if (dto) {
			DtoSchemaNameRegisterClasses(dto, DtoSchemaNameGetRouteOrigin(schemaPrefix, method, dtoType));
		}
	}

	if (ApiRouteIsDiscriminatedDtoProperties(responseDto)) {
		for (const variant of responseDto.type) {
			DtoSchemaNameRegisterClasses(variant, `variant ${variant.name} of ${responseOrigin}`);
		}
	} else if (responseDto) {
		DtoSchemaNameRegisterClasses(responseDto, responseOrigin);
	}

	for (const dto of dtoList) {
		for (const swaggerDto of dto ? [dto, ...GetRegisteredAutoDtoChildrenRecursive(dto.prototype as object)] : []) {
			if (swaggerModels.includes(swaggerDto)) {
				continue;
			}

			swaggerModels.push(swaggerDto);

			Reflect.defineMetadata(SWAGGER_METADATA_CONSTANT.EXTRA_MODELS, swaggerModels, target);
		}
	}
}
