import type { IApiAuthenticationRequest } from "@interface/api-authentication-request.interface";
import type { IApiControllerProperties, IApiGetListResponseResult } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { IApiControllerPrimaryColumn } from "@interface/utility";
import type { Type } from "@nestjs/common";
import type { TApiControllerMethod } from "@type/class";
import type { TApiControllerGetListQuery, TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetListPropertiesWhere, TApiFunctionGetProperties, TApiFunctionUpdateCriteria } from "@type/decorator/api/function";
import type { TApiControllerMethodMap, TApiControllerMethodName, TApiControllerMethodNameMap, TApiControllerTargetMethod } from "@type/factory/api/controller";
import type { ClassConstructor } from "class-transformer";
import type { DeepPartial, FindOptionsOrder, FindOptionsWhere } from "typeorm";

import { CONTROLLER_API_DECORATOR_CONSTANT, FUNCTION_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiDtoType, EApiRouteType, EApiSubscriberOnType } from "@enum/decorator/api";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiControllerApplyDecorators, ApiControllerApplyMetadata, ApiControllerGetListTransformFilter, ApiControllerGetPrimaryColumn, ApiControllerHandleRequestRelations, ApiControllerTransformData, ApiControllerValidateRequest, ApiControllerWriteDtoSwagger, ApiControllerWriteMethod } from "@utility/api";
import { analyzeEntityMetadata, DtoGenerate } from "@utility/dto";
import { ErrorException } from "@utility/error-exception.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { plainToInstance } from "class-transformer";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route-execution-context.interface";
import { IApiBaseEntity } from "@interface/api-base-entity.interface";

export class ApiControllerFactory<E extends IApiBaseEntity> {
	protected get targetPrototype(): InstanceType<typeof this.target> {
		return this.target.prototype as InstanceType<typeof this.target>;
	}

	private readonly ENTITY!: IApiEntity<E>;

	constructor(
		protected target: TApiControllerTargetMethod<E>,
		private readonly properties: IApiControllerProperties<E>,
	) {
		this.ENTITY = GenerateEntityInformation<E>(properties.entity);
		analyzeEntityMetadata(this.properties.entity);

		if (!this.ENTITY.primaryKey) {
			throw ErrorException(`Primary key for entity ${this.properties.entity.name ?? "UnknownResource"} not found`);
		}

		Controller(this.properties.path ?? (this.properties.entity.name ? this.properties.entity.name.toLowerCase() : "UnknownResource"))(this.target);
		ApiTags(this.properties.name ?? this.properties.entity.name ?? "UnknownResource")(this.target);
	}

	createMethod(method: EApiRouteType): void {
		if (!(method in this.properties.routes) || this.properties.routes[method]?.isEnabled !== false) {
			const routeConfig: TApiControllerPropertiesRoute<E, typeof method> = this.properties.routes[method] ?? {};
			const routeDecorators: Array<MethodDecorator> | Array<PropertyDecorator> = routeConfig.decorators ?? [];
			const methodName: TApiControllerMethodNameMap[typeof method] = `${CONTROLLER_API_DECORATOR_CONSTANT.RESERVED_METHOD_PREFIX}${method}` as TApiControllerMethodNameMap[typeof method];

			ApiControllerWriteMethod<E>(this as never, this.targetPrototype, method, this.properties, this.ENTITY);
			const targetMethod: TApiControllerMethodMap<E>[typeof method] = this.targetPrototype[methodName] as TApiControllerMethodMap<E>[typeof method];
			ApiControllerApplyMetadata(this.target, this.targetPrototype, this.ENTITY, this.properties, method, methodName, routeConfig);

			if (this.properties.routes[method]?.shouldWriteToController !== false) {
				ApiControllerApplyDecorators(targetMethod, this.ENTITY, this.properties, method, methodName, routeConfig, routeDecorators);
			}

			ApiControllerWriteDtoSwagger(this.target, this.ENTITY, this.properties, method, routeConfig, this.ENTITY);

			// Reflect.defineMetadata(PARAMTYPES_METADATA, [routeConfig.dto.request], this.target, methodNameOnController);
			// Reflect.defineMetadata(PATH_METADATA, `:${this.ENTITY.name}`, this.target, methodNameOnController);

			/* const dtoProperties: Record<string, unknown> = (Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, routeConfig.dto.request) || {}) as Record<string, unknown>;
            const dtoPropertiesArray: Array<unknown> = (Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, routeConfig.dto.request) || []) as Array<unknown>;

            Reflect.defineMetadata(DECORATORS.API_MODEL_PROPERTIES, dtoProperties, routeConfig.dto.request);
            Reflect.defineMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, dtoPropertiesArray, routeConfig.dto.request); */
		}
	}

	init(): void {
		for (const method of Object.values(EApiRouteType)) {
			this.createMethod(method);
		}
	}

	protected [EApiRouteType.CREATE](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.CREATE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<E> {
				const entityInstance = new (properties.entity as new () => E)();
				const beforeExecutionContext: IApiSubscriberRouteExecutionContext<E, { body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest }> = {
					entity: entityInstance,
					routeType: EApiRouteType.CREATE,
					result: { body, headers, ip, authenticationRequest },
					data: { method, methodName, properties, entityMetadata },
				};
				
				const beforeResult = await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.CREATE, EApiSubscriberOnType.BEFORE as any, beforeExecutionContext);

				if (beforeResult) {
					body = beforeResult.body;
					headers = beforeResult.headers;
					ip = beforeResult.ip;
					authenticationRequest = beforeResult.authenticationRequest;
				}

				try {
					const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(body, entityMetadata);

					if (!primaryKey) {
						await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.CREATE, EApiSubscriberOnType.BEFORE_ERROR as any, { ...beforeExecutionContext, result: undefined }, new Error("Primary key not found in entity columns"));
						throw ErrorException("Primary key not found in entity columns");
					}

					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { body }, { authenticationRequest, headers, ip });
					await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, body as Partial<E>);
					await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, body);

					const createResponse: E = await this.service.create(body);
					const dto: Type<unknown> | undefined = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);

					const requestProperties: TApiFunctionGetProperties<E> = {
						relations: properties.routes[method]?.response?.relations,
						where: { [primaryKey.key]: createResponse[primaryKey.key] } as FindOptionsWhere<E>,
					};

					const response: E = await this.service.get(requestProperties);
					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.response?.transformers, properties, { response }, { authenticationRequest, headers, ip });

					const afterExecutionContext: IApiSubscriberRouteExecutionContext<E, E> = {
						result: response,
						entity: response,
						routeType: EApiRouteType.CREATE,
						data: { ...(beforeExecutionContext.data as any), body, headers, ip, authenticationRequest }
					};
					
					const afterResult = await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, response, EApiRouteType.CREATE, EApiSubscriberOnType.AFTER as any, afterExecutionContext);

					const finalResponse = afterResult ?? response;
					return plainToInstance(dto as ClassConstructor<E>, finalResponse, {
						excludeExtraneousValues: true,
						strategy: "excludeAll",
					});

				} catch (error) {
					const errorExecutionContext: IApiSubscriberRouteExecutionContext<E, never> = {
						entity: entityInstance,
						routeType: EApiRouteType.CREATE,
						data: { ...(beforeExecutionContext.data as any), body, headers, ip, authenticationRequest }
					};
					await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.CREATE, EApiSubscriberOnType.AFTER_ERROR as any, errorExecutionContext, error as Error);
					throw error;
				}
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.DELETE](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.DELETE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<void> {
				const entityInstance = new (properties.entity as new () => E)();
				const beforeExecutionContext: IApiSubscriberRouteExecutionContext<E, { parameters: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest }> = {
					entity: entityInstance,
					routeType: EApiRouteType.DELETE,
					result: { parameters, headers, ip, authenticationRequest },
					data: { method, methodName, properties, entityMetadata },
				};
				
				const beforeResult = await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.DELETE, EApiSubscriberOnType.BEFORE as any, beforeExecutionContext);

				if (beforeResult) {
					parameters = beforeResult.parameters;
					headers = beforeResult.headers;
					ip = beforeResult.ip;
					authenticationRequest = beforeResult.authenticationRequest;
				}

				try {
					const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(parameters, entityMetadata);

					if (!primaryKey) {
						await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.DELETE, EApiSubscriberOnType.BEFORE_ERROR as any, { ...beforeExecutionContext, result: undefined }, new Error("Primary key not found in entity columns"));
						throw ErrorException("Primary key not found in entity columns");
					}

					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { parameters }, { authenticationRequest, headers, ip });
					await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, parameters);
					await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, parameters);

					const requestCriteria: TApiFunctionDeleteCriteria<E> = {
						[primaryKey.key]: primaryKey.value,
					} as TApiFunctionDeleteCriteria<E>;

					await this.service.delete(requestCriteria);
					
					const afterExecutionContext: IApiSubscriberRouteExecutionContext<E, Partial<E>> = {
						result: parameters,
						entity: entityInstance,
						routeType: EApiRouteType.DELETE,
						data: { ...(beforeExecutionContext.data as any), parameters, headers, ip, authenticationRequest }
					};

					await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.DELETE, EApiSubscriberOnType.AFTER as any, afterExecutionContext);

				} catch (error) {
					const errorExecutionContext: IApiSubscriberRouteExecutionContext<E, never> = {
						entity: entityInstance,
						routeType: EApiRouteType.DELETE,
						data: { ...(beforeExecutionContext.data as any), parameters, headers, ip, authenticationRequest }
					};
					await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.DELETE, EApiSubscriberOnType.AFTER_ERROR as any, errorExecutionContext, error as Error);
					throw error;
				}
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.GET](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.GET>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<E> {
				const entityInstance = new (properties.entity as new () => E)();
				const beforeExecutionContext: IApiSubscriberRouteExecutionContext<E, { parameters: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest }> = {
					entity: entityInstance,
					routeType: EApiRouteType.GET,
					result: { parameters, headers, ip, authenticationRequest },
					data: { method, methodName, properties, entityMetadata },
				};
				
				const beforeResult = await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.GET, EApiSubscriberOnType.BEFORE as any, beforeExecutionContext);

				if (beforeResult) {
					parameters = beforeResult.parameters;
					headers = beforeResult.headers;
					ip = beforeResult.ip;
					authenticationRequest = beforeResult.authenticationRequest;
				}

				try {
					const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(parameters, entityMetadata);

					if (!primaryKey) {
						await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.GET, EApiSubscriberOnType.BEFORE_ERROR as any, { ...beforeExecutionContext, result: undefined }, new Error("Primary key not found in entity columns"));
						throw ErrorException("Primary key not found in entity columns");
					}

					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { parameters }, { authenticationRequest, headers, ip });
					await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, parameters);
					await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, parameters);

					const requestProperties: TApiFunctionGetProperties<E> = {
						relations: properties.routes[method]?.response?.relations,
						where: { [primaryKey.key]: primaryKey.value } as FindOptionsWhere<E>,
					};

					const response: E = await this.service.get(requestProperties);

					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.response?.transformers, properties, { response }, { authenticationRequest, headers, ip });

					const afterExecutionContext: IApiSubscriberRouteExecutionContext<E, E> = {
						result: response,
						entity: response,
						routeType: EApiRouteType.GET,
						data: { ...(beforeExecutionContext.data as any), parameters, headers, ip, authenticationRequest }
					};
					
					const afterResult = await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, response, EApiRouteType.GET, EApiSubscriberOnType.AFTER as any, afterExecutionContext);

					const finalResponse = afterResult ?? response;
					const dto: Type<unknown> | undefined = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);

					return plainToInstance(dto as ClassConstructor<E>, finalResponse, {
						excludeExtraneousValues: true,
					});

				} catch (error) {
					const errorExecutionContext: IApiSubscriberRouteExecutionContext<E, never> = {
						entity: entityInstance,
						routeType: EApiRouteType.GET,
						data: { ...(beforeExecutionContext.data as any), parameters, headers, ip, authenticationRequest }
					};
					await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.GET, EApiSubscriberOnType.AFTER_ERROR as any, errorExecutionContext, error as Error);
					throw error;
				}
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.GET_LIST](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.GET_LIST>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, query: TApiControllerGetListQuery<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<IApiGetListResponseResult<E>> {
				const entityInstance = new (properties.entity as new () => E)();
				const beforeExecutionContext: IApiSubscriberRouteExecutionContext<E, { query: TApiControllerGetListQuery<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest }> = {
					entity: entityInstance,
					routeType: EApiRouteType.GET_LIST,
					result: { query, headers, ip, authenticationRequest },
					data: { method, methodName, properties, entityMetadata },
				};
				
				const beforeResult = await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.GET_LIST, EApiSubscriberOnType.BEFORE as any, beforeExecutionContext);

				if (beforeResult) {
					query = beforeResult.query;
					headers = beforeResult.headers;
					ip = beforeResult.ip;
					authenticationRequest = beforeResult.authenticationRequest;
				}

				try {
					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { query }, { authenticationRequest, headers, ip });
					await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, query);
					await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, query);

					const { limit, orderBy, orderDirection, page, ...getListQuery }: TApiControllerGetListQuery<E> = query;
					const filter: TApiFunctionGetListPropertiesWhere<E> = ApiControllerGetListTransformFilter<E>(getListQuery, entityMetadata);

					const requestProperties: TApiFunctionGetListProperties<E> = {
						relations: properties.routes[method]?.response?.relations,
						skip: query.limit * (query.page - 1),
						take: query.limit,
						where: filter,
					};

					if (orderBy) {
						requestProperties.order = { [orderBy as never as string]: orderDirection ?? FUNCTION_API_DECORATOR_CONSTANT.DEFAULT_FILTER_ORDER_BY_DIRECTION } as FindOptionsOrder<E>;
					}

					const response: IApiGetListResponseResult<E> = await this.service.getList(requestProperties);
					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { response }, { authenticationRequest, headers, ip });

					const afterExecutionContext: IApiSubscriberRouteExecutionContext<E, IApiGetListResponseResult<E>> = {
						result: response,
						entity: entityInstance,
						routeType: EApiRouteType.GET_LIST,
						data: { ...(beforeExecutionContext.data as any), query, headers, ip, authenticationRequest }
					};
					
					const afterResult = await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.GET_LIST, EApiSubscriberOnType.AFTER as any, afterExecutionContext);

					const finalResponse = afterResult ?? response;
					const dto: Type<unknown> | undefined = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);

					return plainToInstance(dto as ClassConstructor<IApiGetListResponseResult<E>>, finalResponse, {
						excludeExtraneousValues: true,
					});

				} catch (error) {
					const errorExecutionContext: IApiSubscriberRouteExecutionContext<E, never> = {
						entity: entityInstance,
						routeType: EApiRouteType.GET_LIST,
						data: { ...(beforeExecutionContext.data as any), query, headers, ip, authenticationRequest }
					};
					await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.GET_LIST, EApiSubscriberOnType.AFTER_ERROR as any, errorExecutionContext, error as Error);
					throw error;
				}
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.PARTIAL_UPDATE](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.PARTIAL_UPDATE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<E> {
				const entityInstance = new (properties.entity as new () => E)();
				const beforeExecutionContext: IApiSubscriberRouteExecutionContext<E, { parameters: Partial<E>, body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest }> = {
					entity: entityInstance,
					routeType: EApiRouteType.PARTIAL_UPDATE,
					result: { parameters, body, headers, ip, authenticationRequest },
					data: { method, methodName, properties, entityMetadata },
				};
				
				const beforeResult = await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.PARTIAL_UPDATE, EApiSubscriberOnType.BEFORE as any, beforeExecutionContext);

				if (beforeResult) {
					parameters = beforeResult.parameters;
					body = beforeResult.body;
					headers = beforeResult.headers;
					ip = beforeResult.ip;
					authenticationRequest = beforeResult.authenticationRequest;
				}

				try {
					const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(parameters, entityMetadata);

					if (!primaryKey) {
						await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.PARTIAL_UPDATE, EApiSubscriberOnType.BEFORE_ERROR as any, { ...beforeExecutionContext, result: undefined }, new Error("Primary key not found in entity columns"));
						throw ErrorException("Primary key not found in entity columns");
					}

					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { body, parameters }, { authenticationRequest, headers, ip });
					await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, parameters);
					await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, parameters);

					const requestCriteria: TApiFunctionUpdateCriteria<E> = {
						[primaryKey.key]: primaryKey.value,
					} as TApiFunctionUpdateCriteria<E>;

					const response: E = await this.service.update(requestCriteria, body);

					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.response?.transformers, properties, { response }, { authenticationRequest, headers, ip });

					const afterExecutionContext: IApiSubscriberRouteExecutionContext<E, E> = {
						result: response,
						entity: response,
						routeType: EApiRouteType.PARTIAL_UPDATE,
						data: { ...(beforeExecutionContext.data as any), parameters, body, headers, ip, authenticationRequest }
					};
					
					const afterResult = await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, response, EApiRouteType.PARTIAL_UPDATE, EApiSubscriberOnType.AFTER as any, afterExecutionContext);

					const finalResponse = afterResult ?? response;
					const dto: Type<unknown> | undefined = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);

					return plainToInstance(dto as ClassConstructor<E>, finalResponse, {
						excludeExtraneousValues: true,
					});

				} catch (error) {
					const errorExecutionContext: IApiSubscriberRouteExecutionContext<E, never> = {
						entity: entityInstance,
						routeType: EApiRouteType.PARTIAL_UPDATE,
						data: { ...(beforeExecutionContext.data as any), parameters, body, headers, ip, authenticationRequest }
					};
					await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.PARTIAL_UPDATE, EApiSubscriberOnType.AFTER_ERROR as any, errorExecutionContext, error as Error);
					throw error;
				}
			},
			"name",
			{ value: methodName },
		);
	}

	// eslint-disable-next-line @elsikora/sonar/no-identical-functions
	protected [EApiRouteType.UPDATE](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.UPDATE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<E> {
				const entityInstance = new (properties.entity as new () => E)();
				const beforeExecutionContext: IApiSubscriberRouteExecutionContext<E, { parameters: Partial<E>, body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest }> = {
					entity: entityInstance,
					routeType: EApiRouteType.UPDATE,
					result: { parameters, body, headers, ip, authenticationRequest },
					data: { method, methodName, properties, entityMetadata },
				};
				
				const beforeResult = await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.UPDATE, EApiSubscriberOnType.BEFORE as any, beforeExecutionContext);

				if (beforeResult) {
					parameters = beforeResult.parameters;
					body = beforeResult.body;
					headers = beforeResult.headers;
					ip = beforeResult.ip;
					authenticationRequest = beforeResult.authenticationRequest;
				}

				try {
					const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(parameters, entityMetadata);

					if (!primaryKey) {
						await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.UPDATE, EApiSubscriberOnType.BEFORE_ERROR as any, { ...beforeExecutionContext, result: undefined }, new Error("Primary key not found in entity columns"));
						throw ErrorException("Primary key not found in entity columns");
					}

					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { body, parameters }, { authenticationRequest, headers, ip });
					await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, parameters);
					await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, parameters);

					const requestCriteria: TApiFunctionUpdateCriteria<E> = {
						[primaryKey.key]: primaryKey.value,
					} as TApiFunctionUpdateCriteria<E>;

					const response: E = await this.service.update(requestCriteria, body);

					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.response?.transformers, properties, { response }, { authenticationRequest, headers, ip });

					const afterExecutionContext: IApiSubscriberRouteExecutionContext<E, E> = {
						result: response,
						entity: response,
						routeType: EApiRouteType.UPDATE,
						data: { ...(beforeExecutionContext.data as any), parameters, body, headers, ip, authenticationRequest }
					};
					
					const afterResult = await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, response, EApiRouteType.UPDATE, EApiSubscriberOnType.AFTER as any, afterExecutionContext);
					
					const finalResponse = afterResult ?? response;
					const dto: Type<unknown> | undefined = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);

					return plainToInstance(dto as ClassConstructor<E>, finalResponse, {
						excludeExtraneousValues: true,
					});
				
				} catch (error) {
					const errorExecutionContext: IApiSubscriberRouteExecutionContext<E, never> = {
						entity: entityInstance,
						routeType: EApiRouteType.UPDATE,
						data: { ...(beforeExecutionContext.data as any), parameters, body, headers, ip, authenticationRequest }
					};
					await ApiSubscriberExecutor.executeRouteSubscribers(this.constructor as new () => any, entityInstance, EApiRouteType.UPDATE, EApiSubscriberOnType.AFTER_ERROR as any, errorExecutionContext, error as Error);
					throw error;
				}
			},
			"name",
			{ value: methodName },
		);
	}
}
