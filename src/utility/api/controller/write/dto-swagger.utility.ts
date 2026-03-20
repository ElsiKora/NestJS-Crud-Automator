import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TMetadata } from "@type/class";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";

import { MetadataStorage } from "@class/metadata-storage.class";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiDtoType, EApiPropertyDescribeType } from "@enum/decorator/api";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { ApiControllerGetDto } from "@utility/api/controller/get/dto.utility";
import { CamelCaseString } from "@utility/camel-case-string.utility";

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
export function ApiControllerWriteDtoSwagger<E extends IApiBaseEntity>(target: object, entity: IApiEntity<E>, properties: IApiControllerProperties<E>, method: EApiRouteType, routeConfig: TApiControllerPropertiesRoute<E, typeof method>, entityMetadata: IApiEntity<E>): void {
	const swaggerModels: Array<unknown> = (Reflect.getMetadata(DECORATORS.API_EXTRA_MODELS, target) ?? []) as Array<unknown>;
	const entityNames: Array<string> = [];

	if (typeof properties.entity === "function") {
		let current: (new (...arguments_: Array<unknown>) => unknown) | undefined = properties.entity as unknown as new (...arguments_: Array<unknown>) => unknown;

		while (current) {
			entityNames.push(current.name);

			const parentPrototype: null | object = Object.getPrototypeOf(current.prototype) as null | object;
			const parentConstructor: unknown = parentPrototype ? Reflect.get(parentPrototype, "constructor") : undefined;
			const parent: (new (...arguments_: Array<unknown>) => unknown) | undefined = typeof parentConstructor === "function" ? (parentConstructor as new (...arguments_: Array<unknown>) => unknown) : undefined;

			if (!parent || parent === Object) {
				break;
			}

			current = parent;
		}
	} else if (properties.entity.name) {
		entityNames.push(properties.entity.name);
	}

	const requestDto: Type<unknown> | undefined = ApiControllerGetDto(properties, entity, method, EApiDtoType.REQUEST, routeConfig);
	const queryDto: Type<unknown> | undefined = ApiControllerGetDto(properties, entity, method, EApiDtoType.QUERY, routeConfig);
	const bodyDto: Type<unknown> | undefined = ApiControllerGetDto(properties, entity, method, EApiDtoType.BODY, routeConfig);
	const responseDto: Type<unknown> | undefined = ApiControllerGetDto(properties, entity, method, EApiDtoType.RESPONSE, routeConfig);

	const dtoList: Array<Type<unknown> | undefined> = [requestDto, queryDto, bodyDto, responseDto];

	for (const dto of dtoList) {
		if (dto && !swaggerModels.includes(dto)) {
			swaggerModels.push(dto);

			const storage: MetadataStorage = MetadataStorage.getInstance();
			const mergedMetadata: TMetadata = {};
			let hasMetadata: boolean = false;

			for (const entityName of [...entityNames].reverse()) {
				const currentMetadata: TMetadata | undefined = storage.getMetadata(entityName);

				if (currentMetadata) {
					hasMetadata = true;
					Object.assign(mergedMetadata, currentMetadata);
				}
			}

			const metadata: TMetadata | undefined = hasMetadata ? mergedMetadata : undefined;

			if (metadata)
				for (const key of Object.keys(metadata)) {
					if (metadata[key]?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] && metadata[key]?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY]?.type === EApiPropertyDescribeType.RELATION) {
						const relationClass: { new (): unknown; prototype: unknown } = class GeneratedDTO {
							constructor() {
								Object.defineProperty(this, "id", {
									// eslint-disable-next-line @elsikora/typescript/naming-convention
									configurable: true,
									// eslint-disable-next-line @elsikora/typescript/naming-convention
									enumerable: true,
									value: undefined,
									// eslint-disable-next-line @elsikora/typescript/naming-convention
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
