import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";
import type { IApiControllerReadPlan } from "@interface/class/api/controller/read";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TMetadata } from "@type/class";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { MetadataStorage } from "@class/metadata-storage.class";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiDtoType, EApiPropertyDescribeType } from "@enum/decorator/api";
import { DECORATORS } from "@nestjs/swagger/dist/constants.js";
import { ApiControllerGetDtoWithReadPlan } from "@utility/api/controller/get/dto.utility";
import { CamelCaseString } from "@utility/camel-case-string.utility";
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
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Route-scoped plan used by dynamic QUERY DTO generation.
 * @returns {void}
 * @template E - The entity type
 */
export function ApiControllerWriteDtoSwagger<E extends IApiBaseEntity>(target: object, entity: IApiEntity<E>, properties: IApiControllerProperties<E>, method: EApiRouteType, routeConfig: TApiControllerPropertiesRoute<E, typeof method>, entityMetadata: IApiEntity<E>, queryPlan?: IApiControllerGetListQueryPlan): void {
	ApiControllerWriteDtoSwaggerWithReadPlan(target, entity, properties, method, routeConfig, entityMetadata, queryPlan);
}

/**
 * Registers generated DTOs and Swagger parameters with an internal compiled read plan.
 * @template E - Entity type
 * @param {object} target - Controller class.
 * @param {IApiEntity<E>} entity - Entity metadata.
 * @param {IApiControllerProperties<E>} properties - Controller configuration.
 * @param {EApiRouteType} method - Generated route type.
 * @param {TApiControllerPropertiesRoute<E, typeof method>} routeConfig - Route configuration.
 * @param {IApiEntity<E>} entityMetadata - Entity metadata used for DTO generation.
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Internal compiled QUERY plan.
 * @param {IApiControllerReadPlan} [readPlan] - Internal compiled PARAMETERS plan.
 * @param {IApiControllerIdentityPlan} [identityPlan] - Internal GET identity alias plan.
 * @returns {void}
 */
export function ApiControllerWriteDtoSwaggerWithReadPlan<E extends IApiBaseEntity>(target: object, entity: IApiEntity<E>, properties: IApiControllerProperties<E>, method: EApiRouteType, routeConfig: TApiControllerPropertiesRoute<E, typeof method>, entityMetadata: IApiEntity<E>, queryPlan?: IApiControllerGetListQueryPlan, readPlan?: IApiControllerReadPlan, identityPlan?: IApiControllerIdentityPlan): void {
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

	const requestDto: Type<unknown> | undefined = ApiControllerGetDtoWithReadPlan(properties, entity, method, EApiDtoType.PARAMETERS, routeConfig, queryPlan, readPlan, identityPlan);
	const queryDto: Type<unknown> | undefined = ApiControllerGetDtoWithReadPlan(properties, entity, method, EApiDtoType.QUERY, routeConfig, queryPlan, readPlan, identityPlan);
	const bodyDto: Type<unknown> | undefined = ApiControllerGetDtoWithReadPlan(properties, entity, method, EApiDtoType.BODY, routeConfig, queryPlan, readPlan, identityPlan);
	const responseDto: Type<unknown> | undefined = ApiControllerGetDtoWithReadPlan(properties, entity, method, EApiDtoType.RESPONSE, routeConfig, queryPlan, readPlan, identityPlan);

	const dtoList: Array<Type<unknown> | undefined> = [requestDto, queryDto, bodyDto, responseDto];

	for (const dto of dtoList) {
		for (const swaggerDto of dto ? [dto, ...GetRegisteredAutoDtoChildrenRecursive(dto.prototype as object)] : []) {
			if (swaggerModels.includes(swaggerDto)) {
				continue;
			}

			swaggerModels.push(swaggerDto);

			const storage: MetadataStorage = MetadataStorage.getInstance();
			const mergedMetadata: TMetadata = {};
			let hasMetadata: boolean = false;

			for (const entityName of entityNames.toReversed()) {
				const currentMetadata: TMetadata | undefined = storage.getMetadata(entityName);

				if (currentMetadata) {
					hasMetadata = true;
					Object.assign(mergedMetadata, currentMetadata);
				}
			}

			const metadata: TMetadata | undefined = hasMetadata ? mergedMetadata : undefined;

			if (metadata)
				for (const key of Object.keys(metadata)) {
					const propertyMetadata: TApiPropertyDescribeProperties | undefined = metadata[key]?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

					if (propertyMetadata?.type === EApiPropertyDescribeType.RELATION && propertyMetadata.isAutoDtoEnabled !== false) {
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
