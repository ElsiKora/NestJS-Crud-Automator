import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { CONTROLLER_API_DECORATOR_CONSTANT, FUNCTION_API_DECORATOR_CONSTANT } from "../../constant";
import { EApiDtoType, EApiRouteType } from "../../enum";
import { ApiControllerGetListTransformFilter, ApiControllerTransformData, ApiControllerWriteDtoSwagger, ApiControllerWriteMethod, DtoGenerate, ErrorException, GenerateEntityInformation } from "../../utility";
import { ApiControllerApplyDecorators } from "../../utility/api/controller/apply-decorators.utility";
import { ApiControllerApplyMetadata } from "../../utility/api/controller/apply-metadata.utility";
import { ApiControllerGetPrimaryColumn } from "../../utility/api/controller/get-primary-column.utility";
import { ApiControllerHandleRequestRelations } from "../../utility/api/controller/handle-request-relations.utility";
import { ApiControllerValidateRequest } from "../../utility/api/controller/validate-request.utility";
import { analyzeEntityMetadata } from "../../utility/dto/analize.utility";
export class ApiControllerFactory {
    target;
    properties;
    get targetPrototype() {
        return this.target.prototype;
    }
    ENTITY;
    constructor(target, properties) {
        this.target = target;
        this.properties = properties;
        this.ENTITY = GenerateEntityInformation(properties.entity);
        analyzeEntityMetadata(this.properties.entity);
        if (!this.ENTITY.primaryKey) {
            throw ErrorException(`Primary key for entity ${this.properties.entity.name ?? "UnknownResource"} not found`);
        }
        Controller(this.properties.path ?? (this.properties.entity.name ? this.properties.entity.name.toLowerCase() : "UnknownResource"))(this.target);
        ApiTags(this.properties.name ?? this.properties.entity.name ?? "UnknownResource")(this.target);
    }
    createMethod(method) {
        if (!(method in this.properties.routes) || this.properties.routes[method]?.isEnabled !== false) {
            const routeConfig = this.properties.routes[method] ?? {};
            const routeDecorators = routeConfig.decorators ?? [];
            const methodName = `${CONTROLLER_API_DECORATOR_CONSTANT.RESERVED_METHOD_PREFIX}${method}`;
            ApiControllerWriteMethod(this, this.targetPrototype, method, this.properties, this.ENTITY);
            const targetMethod = this.targetPrototype[methodName];
            ApiControllerApplyMetadata(this.target, this.targetPrototype, this.ENTITY, this.properties, method, methodName, routeConfig);
            ApiControllerApplyDecorators(targetMethod, this.ENTITY, this.properties, method, methodName, routeConfig, routeDecorators);
            ApiControllerWriteDtoSwagger(this.target, this.ENTITY, this.properties, method, routeConfig, this.ENTITY);
        }
    }
    init() {
        for (const method of Object.values(EApiRouteType)) {
            this.createMethod(method);
        }
    }
    [EApiRouteType.CREATE](method, methodName, properties, entityMetadata) {
        this.targetPrototype[methodName] = Object.defineProperty(async function (body, headers, ip, authenticationRequest) {
            const primaryKey = ApiControllerGetPrimaryColumn(body, entityMetadata);
            if (!primaryKey) {
                throw ErrorException("Primary key not found in entity columns");
            }
            ApiControllerTransformData(properties.routes[method]?.request?.transformers, properties, { body }, { authenticationRequest, headers, ip });
            await ApiControllerValidateRequest(properties.routes[method]?.request?.validators, properties, body);
            await ApiControllerHandleRequestRelations(this, properties, properties.routes[method]?.request?.relations, body);
            const createResponse = await this.service.create(body);
            const dto = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);
            const requestProperties = {
                relations: properties.routes[method]?.response?.relations,
                where: {
                    [primaryKey.key]: createResponse[primaryKey.key],
                },
            };
            const response = await this.service.get(requestProperties);
            ApiControllerTransformData(properties.routes[method]?.response?.transformers, properties, { response }, { authenticationRequest, headers, ip });
            return plainToInstance(dto, response, {
                excludeExtraneousValues: true,
            });
        }, "name", { value: methodName });
    }
    [EApiRouteType.DELETE](method, methodName, properties, entityMetadata) {
        this.targetPrototype[methodName] = Object.defineProperty(async function (parameters, headers, ip, authenticationRequest) {
            const primaryKey = ApiControllerGetPrimaryColumn(parameters, entityMetadata);
            if (!primaryKey) {
                throw ErrorException("Primary key not found in entity columns");
            }
            ApiControllerTransformData(properties.routes[method]?.request?.transformers, properties, { parameters }, { authenticationRequest, headers, ip });
            await ApiControllerValidateRequest(properties.routes[method]?.request?.validators, properties, parameters);
            await ApiControllerHandleRequestRelations(this, properties, properties.routes[method]?.request?.relations, parameters);
            const requestCriteria = {
                [primaryKey.key]: primaryKey.value,
            };
            await this.service.delete(requestCriteria);
        }, "name", { value: methodName });
    }
    [EApiRouteType.GET](method, methodName, properties, entityMetadata) {
        this.targetPrototype[methodName] = Object.defineProperty(async function (parameters, headers, ip, authenticationRequest) {
            const primaryKey = ApiControllerGetPrimaryColumn(parameters, entityMetadata);
            if (!primaryKey) {
                throw ErrorException("Primary key not found in entity columns");
            }
            ApiControllerTransformData(properties.routes[method]?.request?.transformers, properties, { parameters }, { authenticationRequest, headers, ip });
            await ApiControllerValidateRequest(properties.routes[method]?.request?.validators, properties, parameters);
            await ApiControllerHandleRequestRelations(this, properties, properties.routes[method]?.request?.relations, parameters);
            const requestProperties = {
                relations: properties.routes[method]?.response?.relations,
                where: {
                    [primaryKey.key]: primaryKey.value,
                },
            };
            const response = await this.service.get(requestProperties);
            ApiControllerTransformData(properties.routes[method]?.response?.transformers, properties, { response }, { authenticationRequest, headers, ip });
            const dto = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);
            return plainToInstance(dto, response, {
                excludeExtraneousValues: true,
            });
        }, "name", { value: methodName });
    }
    [EApiRouteType.GET_LIST](method, methodName, properties, entityMetadata) {
        this.targetPrototype[methodName] = Object.defineProperty(async function (query, headers, ip, authenticationRequest) {
            ApiControllerTransformData(properties.routes[method]?.request?.transformers, properties, { query }, { authenticationRequest, headers, ip });
            await ApiControllerValidateRequest(properties.routes[method]?.request?.validators, properties, query);
            await ApiControllerHandleRequestRelations(this, properties, properties.routes[method]?.request?.relations, query);
            const { limit, orderBy, orderDirection, page, ...getListQuery } = query;
            const filter = ApiControllerGetListTransformFilter(getListQuery, entityMetadata);
            const requestProperties = {
                relations: properties.routes[method]?.response?.relations,
                skip: query.limit * (query.page - 1),
                take: query.limit,
                where: filter,
            };
            if (orderBy) {
                requestProperties.order = {
                    [orderBy]: orderDirection ?? FUNCTION_API_DECORATOR_CONSTANT.DEFAULT_FILTER_ORDER_BY_DIRECTION,
                };
            }
            const response = await this.service.getList(requestProperties);
            ApiControllerTransformData(properties.routes[method]?.request?.transformers, properties, { response }, { authenticationRequest, headers, ip });
            const dto = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);
            return plainToInstance(dto, response, {
                excludeExtraneousValues: true,
            });
        }, "name", { value: methodName });
    }
    [EApiRouteType.PARTIAL_UPDATE](method, methodName, properties, entityMetadata) {
        this.targetPrototype[methodName] = Object.defineProperty(async function (parameters, body, headers, ip, authenticationRequest) {
            const primaryKey = ApiControllerGetPrimaryColumn(parameters, entityMetadata);
            if (!primaryKey) {
                throw ErrorException("Primary key not found in entity columns");
            }
            ApiControllerTransformData(properties.routes[method]?.request?.transformers, properties, { body, parameters }, { authenticationRequest, headers, ip });
            await ApiControllerValidateRequest(properties.routes[method]?.request?.validators, properties, parameters);
            await ApiControllerHandleRequestRelations(this, properties, properties.routes[method]?.request?.relations, parameters);
            const requestCriteria = {
                [primaryKey.key]: primaryKey.value,
            };
            const response = await this.service.update(requestCriteria, body);
            ApiControllerTransformData(properties.routes[method]?.request?.transformers, properties, { response }, { authenticationRequest, headers, ip });
            const dto = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);
            return plainToInstance(dto, response, {
                excludeExtraneousValues: true,
            });
        }, "name", { value: methodName });
    }
    [EApiRouteType.UPDATE](method, methodName, properties, entityMetadata) {
        this.targetPrototype[methodName] = Object.defineProperty(async function (parameters, body, headers, ip, authenticationRequest) {
            const primaryKey = ApiControllerGetPrimaryColumn(parameters, entityMetadata);
            if (!primaryKey) {
                throw ErrorException("Primary key not found in entity columns");
            }
            ApiControllerTransformData(properties.routes[method]?.request?.transformers, properties, { body, parameters }, { authenticationRequest, headers, ip });
            await ApiControllerValidateRequest(properties.routes[method]?.request?.validators, properties, parameters);
            await ApiControllerHandleRequestRelations(this, properties, properties.routes[method]?.request?.relations, parameters);
            const requestCriteria = {
                [primaryKey.key]: primaryKey.value,
            };
            const response = await this.service.update(requestCriteria, body);
            ApiControllerTransformData(properties.routes[method]?.request?.transformers, properties, { response }, { authenticationRequest, headers, ip });
            const dto = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);
            return plainToInstance(dto, response, {
                excludeExtraneousValues: true,
            });
        }, "name", { value: methodName });
    }
}
//# sourceMappingURL=controller.factory.js.map