import { Controller } from "@nestjs/common";

import { ApiTags } from "@nestjs/swagger";

import { plainToInstance } from "class-transformer";

import { CONTROLLER_API_DECORATOR_CONSTANT } from "../../constant";
import { EApiDtoType, EApiRouteType } from "../../enum";

import { ApiControllerApplyDecorators, ApiControllerApplyMetadata, ApiControllerValidateRequest, ApiControllerWriteDtoSwagger, ApiControllerWriteMethod, CapitalizeString, DtoGenerate, ErrorException, GenerateEntityInformation } from "../../utility";

import { ApiControllerGetPrimaryColumn } from "../../utility/api/controller/get-primary-column.utility";
import { ApiControllerHandleRequestRelations } from "../../utility/api/controller/handle-request-relations.utility";

import { ApiControllerTransformRequest } from "../../utility/api/controller/transform-request.utility";
import { analyzeEntityMetadata } from "../../utility/dto/analize.utility";

import type { IApiAuthenticationRequest, IApiControllerPrimaryColumn, IApiEntity, IApiGetListResponseResult, TApiControllerPropertiesRoute } from "../../interface";
import type { IApiControllerProperties } from "../../interface/decorator/api/controller-properties.interface";
import {
	TApiControllerMethod, TApiControllerMethodMap, TApiControllerMethodName,
	TApiControllerMethodNameMap,
	TApiControllerTargetMethod,
	TApiFunctionGetListProperties
} from "../../type";

import type { Type } from "@nestjs/common";
import type { ClassConstructor } from "class-transformer";


export class ApiControllerFactory<E> {
	private readonly ENTITY!: IApiEntity<E>;

	constructor(
		protected target: TApiControllerTargetMethod<E>,
		private readonly properties: IApiControllerProperties<E>,
	) {
		this.ENTITY = GenerateEntityInformation<E>(properties.entity);
		analyzeEntityMetadata(this.properties.entity);

		if (!this.ENTITY.primaryKey) {
			throw ErrorException(`Primary key for entity ${this.properties.entity.name} not found`);
		}

		Controller(this.properties.path || this.properties.entity.name.toLowerCase())(this.target);
		ApiTags(this.properties.name || this.properties.entity.name)(this.target);
	}

	createMethod(method: EApiRouteType): void {
		if (!(method in this.properties.routes) || this.properties.routes[method]?.isEnabled !== false) {
			const routeConfig: TApiControllerPropertiesRoute<E, typeof method> = this.properties.routes[method] || {};
			const routeDecorators: Array<MethodDecorator> | Array<PropertyDecorator> = routeConfig.decorators || [];
			const methodName: TApiControllerMethodNameMap[typeof method] = `${CONTROLLER_API_DECORATOR_CONSTANT.RESERVED_METHOD_PREFIX}${CapitalizeString(method)}` as TApiControllerMethodNameMap[typeof method];

			ApiControllerWriteMethod<E>(this as never, this.targetPrototype, method, this.properties, this.ENTITY);
			const targetMethod: TApiControllerMethodMap<E>[typeof method] = this.targetPrototype[methodName];
			ApiControllerApplyMetadata(this.target, this.targetPrototype, this.ENTITY, this.properties, method, methodName, routeConfig);
			ApiControllerApplyDecorators(targetMethod, this.ENTITY, this.properties, method, methodName, routeConfig, routeDecorators);
			ApiControllerWriteDtoSwagger(this.target, this.ENTITY, this.properties, method, routeConfig, this.ENTITY);

			// Reflect.defineMetadata(PARAMTYPES_METADATA, [routeConfig.dto.request], this.target, methodNameOnController);
			// Reflect.defineMetadata(PATH_METADATA, `:${this.ENTITY.name}`, this.target, methodNameOnController);

			/* const dtoProperties: Record<string, unknown> = (Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, routeConfig.dto.request) || {}) as Record<string, unknown>;
            const dtoPropertiesArray: Array<unknown> = (Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, routeConfig.dto.request) || []) as Array<unknown>;

            Reflect.defineMetadata(DECORATORS.API_MODEL_PROPERTIES, dtoProperties, routeConfig.dto.request);
            Reflect.defineMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, dtoPropertiesArray, routeConfig.dto.request); */
		}
	}

	protected [EApiRouteType.CREATE](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.CREATE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, body: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<E> {
				try {
					const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(body, entityMetadata);

					if (!primaryKey) {
						throw ErrorException("Primary key not found in entity columns");
					}

					console.log("PRE TRANSFORM DATA", body);
					ApiControllerTransformRequest<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { body }, { authenticationRequest, headers, ip });
					console.log("POST TRANSFORM DATA", body);
					await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, body);
					await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, body);


					const createResponse: E = await this.service.create(body);
					const dto: Type<unknown> | undefined = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);

					const response: E = await this.service.get(createResponse[primaryKey.key] as string, {}, properties.routes[method]?.response?.relations);

					console.log("PRE TRANSFORM RESPONSE", response);
					ApiControllerTransformRequest<E, typeof method>(properties.routes[method]?.response?.transformers, properties, { response }, { authenticationRequest, headers, ip });
					console.log("POST TRANSFORM RESPONSE", response);

					return plainToInstance(dto as ClassConstructor<E>, response, {
						excludeExtraneousValues: true,
					});
				} catch (error) {
					console.log(error);

					throw error;
				}
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.DELETE](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.DELETE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, _headers: Record<string, string>, _ip: string, _authenticationRequest?: IApiAuthenticationRequest): Promise<void> {
				const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(parameters, entityMetadata);

				if (!primaryKey) {
					throw ErrorException("Primary key not found in entity columns");
				}

				await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, parameters);
				await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, parameters);

				await this.service.get(primaryKey.value, {}, properties.routes[EApiRouteType.GET]?.response?.relations);
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.GET](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.GET>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, _headers: Record<string, string>, _ip: string, _authenticationRequest?: IApiAuthenticationRequest): Promise<E> {
				const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(parameters, entityMetadata);

				if (!primaryKey) {
					throw ErrorException("Primary key not found in entity columns");
				}

				await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, parameters);
				await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, parameters);

				const response: E = await this.service.get(primaryKey.value, {}, properties.routes[EApiRouteType.GET]?.response?.relations);

				const dto: Type<unknown> | undefined = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);

				return plainToInstance(dto as ClassConstructor<E>, response, {
					excludeExtraneousValues: true,
				});
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.GET_LIST](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.GET_LIST>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, _parameters: Partial<E>, query: TApiFunctionGetListProperties<E>, _headers: Record<string, string>, _ip: string, _authenticationRequest?: IApiAuthenticationRequest): Promise<IApiGetListResponseResult<E>> {
				await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, query);
				await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, query);

				const response: IApiGetListResponseResult<E> = await this.service.getList(query);

				const dto: Type<unknown> | undefined = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);

				return plainToInstance(dto as ClassConstructor<IApiGetListResponseResult<E>>, response, {
					excludeExtraneousValues: true,
				});
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.PARTIAL_UPDATE](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.PARTIAL_UPDATE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, body: Partial<E>, _headers: Record<string, string>, _ip: string, _authenticationRequest?: IApiAuthenticationRequest): Promise<E> {
				const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(parameters, entityMetadata);

				if (!primaryKey) {
					throw ErrorException("Primary key not found in entity columns");
				}

				await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, parameters);
				await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, parameters);

				const response: E = await this.service.update(primaryKey.value, body);

				const dto: Type<unknown> | undefined = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);

				return plainToInstance(dto as ClassConstructor<E>, response, {
					excludeExtraneousValues: true,
				});
			},
			"name",
			{ value: methodName },
		);
	}

	// eslint-disable-next-line sonarjs/no-identical-functions
	protected [EApiRouteType.UPDATE](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.PARTIAL_UPDATE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, body: Partial<E>, _headers: Record<string, string>, _ip: string, _authenticationRequest?: IApiAuthenticationRequest): Promise<E> {
				const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(parameters, entityMetadata);

				if (!primaryKey) {
					throw ErrorException("Primary key not found in entity columns");
				}

				await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, parameters);
				await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, parameters);

				const response: E = await this.service.update(primaryKey.value, body);

				const dto: Type<unknown> | undefined = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);

				return plainToInstance(dto as ClassConstructor<E>, response, {
					excludeExtraneousValues: true,
				});
			},
			"name",
			{ value: methodName },
		);
	}

	init(): void {
		for (const method of Object.values(EApiRouteType)) {
			this.createMethod(method);
		}
	}

	protected get targetPrototype(): InstanceType<typeof this.target> {
		return this.target.prototype as InstanceType<typeof this.target>;
	}
}
