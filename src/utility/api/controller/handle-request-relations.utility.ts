import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties, IApiControllerPropertiesRouteBaseRelationsRequest } from "@interface/decorator/api";
import type { TApiControllerMethod } from "@type/class";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";
import type { TApiFunctionGetProperties } from "@type/decorator/api/function";
import type { TApiServiceKeys } from "@type/decorator/api/service";
import type { DeepPartial, FindOptionsWhere } from "typeorm";

import { ApiServiceBase } from "@class/api/service-base.class";
import { EApiControllerLoadRelationsStrategy, EApiControllerRelationReferenceShape } from "@enum/decorator/api";
import { BadRequestException } from "@nestjs/common";
import { ErrorException } from "@utility/error/exception.utility";
import { GetEntityColumns } from "@utility/get/entity-columns.utility";

/**
 * Manages loading related entities when processing API requests.
 * Determines which relations to load based on configuration strategy (MANUAL or AUTO),
 * finds the appropriate service for each relation, and loads the related entities.
 * @param {TApiControllerMethod<E>} controllerMethod - The controller method with access to service instances
 * @param {IApiControllerProperties<E>} properties - Controller configuration properties
 * @param {IApiControllerPropertiesRouteBaseRelationsRequest<E> | undefined} relationConfig - Configuration for relation loading
 * @param {DeepPartial<E> | Partial<E> | TApiControllerGetListQuery<E>} parameters - The request parameters containing relation IDs
 * @returns {Promise<void>} A promise that resolves when all relations are loaded
 * @throws {BadRequestException} When an invalid relation ID is provided
 * @throws {Error} When service configuration is invalid or services are not found
 * @template E - The entity type
 * @template R - The route type
 */
export async function ApiControllerHandleRequestRelations<E extends IApiBaseEntity>(controllerMethod: TApiControllerMethod<E>, properties: IApiControllerProperties<E>, relationConfig: IApiControllerPropertiesRouteBaseRelationsRequest<E> | undefined, parameters: DeepPartial<E> | Partial<E> | TApiControllerGetListQuery<E>): Promise<void> {
	const loadConfig: IApiControllerPropertiesRouteBaseRelationsRequest<E>["load"] | undefined = relationConfig?.load;
	const referenceConfig: IApiControllerPropertiesRouteBaseRelationsRequest<E>["reference"] | undefined = relationConfig?.reference;

	if (loadConfig?.shouldLoad && referenceConfig) {
		for (const propertyName of GetEntityColumns<E>({ entity: properties.entity, shouldTakeRelationsOnly: true })) {
			// @ts-expect-error
			if (parameters[propertyName] !== undefined && typeof propertyName === "string") {
				if (loadConfig.relationStrategy === EApiControllerLoadRelationsStrategy.MANUAL && !loadConfig.relations?.includes(propertyName)) {
					continue;
				}

				let serviceName: keyof TApiServiceKeys<E> | undefined;

				if (loadConfig.serviceStrategy === EApiControllerLoadRelationsStrategy.MANUAL) {
					const manualServiceName: unknown = loadConfig.services?.[propertyName];

					if (manualServiceName === undefined) {
						throw ErrorException(`Service name not specified for property ${propertyName} in manual mode`);
					}
					serviceName = manualServiceName as keyof TApiServiceKeys<E>;
				} else {
					serviceName = `${propertyName}Service` as keyof TApiServiceKeys<E>;
				}

				if (!serviceName) {
					throw ErrorException(`Service name not specified for property ${propertyName}`);
				}

				const service: unknown = controllerMethod[serviceName];

				if (!service) {
					if ((loadConfig.serviceStrategy === EApiControllerLoadRelationsStrategy.AUTO && loadConfig.shouldForceAllServicesToBeSpecified) || loadConfig.serviceStrategy === EApiControllerLoadRelationsStrategy.MANUAL) {
						throw ErrorException(`Service ${serviceName as string} not found in controller`);
					}
					continue;
				}

				if (!(service instanceof ApiServiceBase)) {
					throw ErrorException(`Service ${serviceName as string} is not an instance of BaseApiService`);
				}

				const referenceKey: string = referenceConfig.key ?? "id";
				const relationValue: unknown = (parameters as Record<string, unknown>)[propertyName];
				const referenceValue: unknown = resolveRelationReferenceValue(propertyName, relationValue, referenceConfig.shape, referenceKey);

				const requestProperties: TApiFunctionGetProperties<E> = {
					where: {
						[referenceKey]: referenceValue,
					} as FindOptionsWhere<E>,
				};

				const entity: E[keyof E & string] = (await service.get(requestProperties)) as E[keyof E & string];

				if (!entity) {
					throw new BadRequestException(`Invalid ${propertyName} ID`);
				}

				// @ts-expect-error
				parameters[propertyName] = entity;
			}
		}
	}
}

/**
 * Resolves the relation reference value according to the configured request shape.
 * @param {string} propertyName - Relation property name used in validation messages.
 * @param {unknown} value - Incoming scalar or object reference value.
 * @param {EApiControllerRelationReferenceShape} shape - Expected relation reference shape.
 * @param {string} referenceKey - Property key to read from object references.
 * @returns {unknown} Reference value used to load the related entity.
 */
function resolveRelationReferenceValue(propertyName: string, value: unknown, shape: EApiControllerRelationReferenceShape, referenceKey: string): unknown {
	if (shape === EApiControllerRelationReferenceShape.SCALAR) {
		if (value !== null && typeof value === "object") {
			throw new BadRequestException(`Relation ${propertyName} must be a scalar reference`);
		}

		return value;
	}

	if (value === null || typeof value !== "object" || !(referenceKey in value)) {
		throw new BadRequestException(`Relation ${propertyName} must be an object reference with "${referenceKey}"`);
	}

	return (value as Record<string, unknown>)[referenceKey];
}
