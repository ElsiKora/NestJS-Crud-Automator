import type { IApiControllerProperties } from "@interface/decorator/api";
import type { TApiControllerMethod } from "@type/class";
import type { TApiControllerGetListQuery, TApiControllerPropertiesRouteBaseRequestRelations } from "@type/decorator/api/controller";
import type { TApiFunctionGetProperties } from "@type/decorator/api/function";
import type { TApiServiceKeys } from "@type/decorator/api/service";
import type { DeepPartial, FindOptionsWhere } from "typeorm";

import { ApiServiceBase } from "@class/api";
import { EApiControllerLoadRelationsStrategy } from "@enum/decorator/api";
import { BadRequestException } from "@nestjs/common";
import { ErrorException } from "@utility/error-exception.utility";
import { GetEntityColumns } from "@utility/get-entity-columns.utility";

/**
 * Manages loading related entities when processing API requests.
 * Determines which relations to load based on configuration strategy (MANUAL or AUTO),
 * finds the appropriate service for each relation, and loads the related entities.
 * @param {TApiControllerMethod<E>} controllerMethod - The controller method with access to service instances
 * @param {IApiControllerProperties<E>} properties - Controller configuration properties
 * @param {TApiControllerPropertiesRouteBaseRequestRelations<E> | undefined} relationConfig - Configuration for relation loading
 * @param {DeepPartial<E> | Partial<E> | TApiControllerGetListQuery<E>} parameters - The request parameters containing relation IDs
 * @returns {Promise<void>} A promise that resolves when all relations are loaded
 * @throws {BadRequestException} When an invalid relation ID is provided
 * @throws {Error} When service configuration is invalid or services are not found
 * @template E - The entity type
 * @template R - The route type
 */
export async function ApiControllerHandleRequestRelations<E>(controllerMethod: TApiControllerMethod<E>, properties: IApiControllerProperties<E>, relationConfig: TApiControllerPropertiesRouteBaseRequestRelations<E> | undefined, parameters: DeepPartial<E> | Partial<E> | TApiControllerGetListQuery<E>): Promise<void> {
	if (relationConfig?.shouldLoadRelations) {
		for (const propertyName of GetEntityColumns<E>({ entity: properties.entity, shouldTakeRelationsOnly: true })) {
			// @ts-expect-error
			if (parameters[propertyName] !== undefined && typeof propertyName === "string") {
				if (relationConfig.relationsLoadStrategy === EApiControllerLoadRelationsStrategy.MANUAL && !relationConfig.relationsToLoad.includes(propertyName)) {
					continue;
				}

				let serviceName: keyof TApiServiceKeys<E> | undefined;

				if (relationConfig.servicesLoadStrategy === EApiControllerLoadRelationsStrategy.MANUAL) {
					const manualServiceName: unknown = relationConfig.relationsServices[propertyName];

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
					if ((relationConfig.servicesLoadStrategy === EApiControllerLoadRelationsStrategy.AUTO && relationConfig.shouldForceAllServicesToBeSpecified) || relationConfig.servicesLoadStrategy === EApiControllerLoadRelationsStrategy.MANUAL) {
						throw ErrorException(`Service ${serviceName as string} not found in controller`);
					}
					continue;
				}

				if (!(service instanceof ApiServiceBase)) {
					throw ErrorException(`Service ${serviceName as string} is not an instance of BaseApiService`);
				}

				const requestProperties: TApiFunctionGetProperties<E> = {
					where: {
						id: parameters[propertyName],
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
