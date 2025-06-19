import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TMetadata } from "@type/class";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";

import { MetadataStorage } from "@class/metadata-storage.class";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiDtoType, EApiPropertyDescribeType } from "@enum/decorator/api";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { DtoGenerate } from "@utility/dto";

/**
 * Generates and registers Swagger documentation for DTOs.
 * Creates or uses existing DTOs for request, query, body, and response,
 * and ensures they're properly registered with Swagger for API documentation.
 * @param {object} target - The target controller class
 * @param {IApiEntity<E>} entity - The entity definition
 * @param {IApiControllerProperties<E>} properties - Controller configuration properties
 * @param {EApiRouteType} method - The type of route (CREATE, DELETE, GET, etc.)
 * @param {TApiControllerPropertiesRoute<E, typeof method>} routeConfig - Route-specific configuration
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @returns {void}
 * @template E - The entity type
 */
export function ApiControllerWriteDtoSwagger<E>(target: object, entity: IApiEntity<E>, properties: IApiControllerProperties<E>, method: EApiRouteType, routeConfig: TApiControllerPropertiesRoute<E, typeof method>, entityMetadata: IApiEntity<E>): void {
	const swaggerModels: Array<unknown> = (Reflect.getMetadata(DECORATORS.API_EXTRA_MODELS, target) ?? []) as Array<unknown>;

	const requestDto: Type<unknown> | undefined = routeConfig.dto?.request ?? DtoGenerate(properties.entity, entity, method, EApiDtoType.REQUEST, routeConfig.autoDto?.[EApiDtoType.REQUEST], routeConfig.authentication?.guard);
	const queryDto: Type<unknown> | undefined = routeConfig.dto?.query ?? DtoGenerate(properties.entity, entity, method, EApiDtoType.QUERY, routeConfig.autoDto?.[EApiDtoType.QUERY], routeConfig.authentication?.guard);
	const bodyDto: Type<unknown> | undefined = routeConfig.dto?.body ?? DtoGenerate(properties.entity, entity, method, EApiDtoType.BODY, routeConfig.autoDto?.[EApiDtoType.BODY], routeConfig.authentication?.guard);
	const responseDto: Type<unknown> | undefined = routeConfig.dto?.response ?? DtoGenerate(properties.entity, entity, method, EApiDtoType.RESPONSE, routeConfig.autoDto?.[EApiDtoType.RESPONSE], routeConfig.authentication?.guard);

	const dtoList: Array<Type<unknown> | undefined> = [requestDto, queryDto, bodyDto, responseDto];

	for (const dto of dtoList) {
		if (dto && !swaggerModels.includes(dto)) {
			swaggerModels.push(dto);

			const storage: MetadataStorage = MetadataStorage.getInstance();

			const metadata: TMetadata | undefined = storage.getMetadata(entityMetadata.name ?? "UnknownResource");

			if (metadata)
				for (const key of Object.keys(metadata)) {
					if (metadata[key]?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] && metadata[key]?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY]?.type === EApiPropertyDescribeType.RELATION) {
						const relationClass: { new (): any; prototype: any } = class GeneratedDTO {
							constructor() {
								Object.defineProperty(this, "id", {
									configurable: true,

									enumerable: true,
									value: undefined,

									writable: true,
								});
							}
						};

						Object.defineProperty(relationClass, "name", {
							value: `${String(entityMetadata.name)}${CamelCaseString(method)}${CamelCaseString(EApiDtoType.BODY)}${key}DTO`,
						});

						swaggerModels.push(relationClass);
					}
				}

			Reflect.defineMetadata(DECORATORS.API_EXTRA_MODELS, swaggerModels, target);
		}
	}
}
