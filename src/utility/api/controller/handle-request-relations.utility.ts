import { BadRequestException } from "@nestjs/common";

import { ApiServiceBase } from "../../../class";
import { EApiControllerLoadRelationsStrategy } from "../../../enum";

import { ErrorException } from "../../error-exception.utility";
import { GetEntityColumns } from "../../get-entity-columns.utility";

import type { IApiControllerProperties } from "../../../interface";
import type {
	TApiControllerGetListQuery,
	TApiControllerMethod,
	TApiControllerPropertiesRouteBaseRequestRelations,
	TApiFunctionGetProperties,
	TApiServiceKeys
} from "../../../type";
import type { DeepPartial, FindOptionsWhere } from "typeorm";

export async function ApiControllerHandleRequestRelations<E>(controllerMethod: TApiControllerMethod<E>, properties: IApiControllerProperties<E>, relationConfig: TApiControllerPropertiesRouteBaseRequestRelations<E> | undefined, parameters: DeepPartial<E> | Partial<E> | TApiControllerGetListQuery<E>): Promise<void> {
	if (relationConfig?.loadRelations) {
		for (const propertyName of GetEntityColumns<E>({ entity: properties.entity, shouldTakeRelationsOnly: true })) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
					if ((relationConfig.servicesLoadStrategy === EApiControllerLoadRelationsStrategy.AUTO && relationConfig.forceAllServicesToBeSpecified) || relationConfig.servicesLoadStrategy === EApiControllerLoadRelationsStrategy.MANUAL) {
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
					throw new BadRequestException(`Invalid ${String(propertyName)} ID`);
				}

				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-expect-error
				parameters[propertyName] = entity;
			}
		}
	}
}
