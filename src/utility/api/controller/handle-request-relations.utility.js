import { BadRequestException } from "@nestjs/common";
import { ApiServiceBase } from "../../../class";
import { EApiControllerLoadRelationsStrategy } from "../../../enum";
import { ErrorException } from "../../error-exception.utility";
import { GetEntityColumns } from "../../get-entity-columns.utility";
export async function ApiControllerHandleRequestRelations(controllerMethod, properties, relationConfig, parameters) {
    if (relationConfig?.shouldLoadRelations) {
        for (const propertyName of GetEntityColumns({ entity: properties.entity, shouldTakeRelationsOnly: true })) {
            if (parameters[propertyName] !== undefined && typeof propertyName === "string") {
                if (relationConfig.relationsLoadStrategy === EApiControllerLoadRelationsStrategy.MANUAL && !relationConfig.relationsToLoad.includes(propertyName)) {
                    continue;
                }
                let serviceName;
                if (relationConfig.servicesLoadStrategy === EApiControllerLoadRelationsStrategy.MANUAL) {
                    const manualServiceName = relationConfig.relationsServices[propertyName];
                    if (manualServiceName === undefined) {
                        throw ErrorException(`Service name not specified for property ${propertyName} in manual mode`);
                    }
                    serviceName = manualServiceName;
                }
                else {
                    serviceName = `${propertyName}Service`;
                }
                if (!serviceName) {
                    throw ErrorException(`Service name not specified for property ${propertyName}`);
                }
                const service = controllerMethod[serviceName];
                if (!service) {
                    if ((relationConfig.servicesLoadStrategy === EApiControllerLoadRelationsStrategy.AUTO && relationConfig.shouldForceAllServicesToBeSpecified) || relationConfig.servicesLoadStrategy === EApiControllerLoadRelationsStrategy.MANUAL) {
                        throw ErrorException(`Service ${serviceName} not found in controller`);
                    }
                    continue;
                }
                if (!(service instanceof ApiServiceBase)) {
                    throw ErrorException(`Service ${serviceName} is not an instance of BaseApiService`);
                }
                const requestProperties = {
                    where: {
                        id: parameters[propertyName],
                    },
                };
                const entity = (await service.get(requestProperties));
                if (!entity) {
                    throw new BadRequestException(`Invalid ${String(propertyName)} ID`);
                }
                parameters[propertyName] = entity;
            }
        }
    }
}
//# sourceMappingURL=handle-request-relations.utility.js.map