import { assignMetadata, Controller, HttpStatus, RequestMethod } from "@nestjs/common";
import { PARAMTYPES_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";

import { RouteParamtypes } from "@nestjs/common/enums/route-paramtypes.enum";
import { ApiTags } from "@nestjs/swagger";
import { DECORATORS } from "@nestjs/swagger/dist/constants";

import { plainToInstance } from "class-transformer";

import { ApiMethod } from "../../decorator/api/method.decorator";
import { EApiAction, EApiDtoType, EApiRouteType } from "../../enum";

import { ApiControllerGetMethodName, ApiControllerWriteMethod, DtoGenerate, ErrorException, GenerateEntityInformation } from "../../utility";

import { analyzeEntityMetadata } from "../../utility/dto/analize.utility";

import type { BaseApiService } from "../../class";

import type { IApiBaseEntity, IApiEntity, IApiEntityColumn, IApiGetListResponseResult } from "../../interface";
import type { IApiControllerProperties, IApiControllerPropertiesRoute } from "../../interface/decorator/api/controller-properties.interface";
import type { TApiFunctionGetListProperties } from "../../type";
import type { Type } from "@nestjs/common";
import type { ClassConstructor } from "class-transformer";
import type { ObjectLiteral } from "typeorm";

export class ApiControllerFactory<E> {
	private readonly ENTITY!: IApiEntity;

	constructor(
		protected target: new (...arguments_: Array<any>) => {
			[key: string]: ((properties: any, body: any) => any) | BaseApiService<E>;
			service: BaseApiService<E>;
		},
		private readonly properties: IApiControllerProperties<E>,
	) {
		this.ENTITY = GenerateEntityInformation(properties.entity);
		analyzeEntityMetadata(this.properties.entity);

		if (!this.ENTITY.primaryKey) {
			throw ErrorException(`Primary key for entity ${this.properties.entity.name} not found`);
		}
	}

	applyDecorators(method: EApiRouteType, methodName: string, routeConfig: IApiControllerPropertiesRoute<E>, decorators: Array<MethodDecorator> | Array<PropertyDecorator>): void {
		const targetMethod: ((properties: any, body: any) => any) | BaseApiService<E> = this.targetPrototype[methodName];
		const responseDto: Type<unknown> | undefined = routeConfig.dto.response || DtoGenerate(this.properties.entity, this.ENTITY, method, EApiDtoType.RESPONSE);
		const customDecorators: Array<MethodDecorator> = [...decorators];

		switch (method) {
			case EApiRouteType.GET: {
				customDecorators.push(
					ApiMethod({
						action: EApiAction.FETCH,
						entity: this.properties.entity,
						httpCode: HttpStatus.OK,
						method: RequestMethod.GET,
						path: `:${this.ENTITY.primaryKey!.name}`,
						responses: { internalServerError: true, notFound: true, unauthorized: true },
						responseType: responseDto,
					}),
				);

				break;
			}

			case EApiRouteType.GET_LIST: {
				customDecorators.push(
					ApiMethod({
						action: EApiAction.FETCH_LIST,
						entity: this.properties.entity,
						httpCode: HttpStatus.OK,
						method: RequestMethod.GET,
						path: "",
						responses: { internalServerError: true, notFound: true, unauthorized: true },
						responseType: responseDto,
					}),
				);

				break;
			}

			case EApiRouteType.CREATE: {
				customDecorators.push(ApiMethod({ action: EApiAction.CREATE, entity: this.properties.entity, httpCode: HttpStatus.CREATED, method: RequestMethod.POST, path: "", responses: { internalServerError: true, unauthorized: true }, responseType: responseDto }));

				break;
			}

			case EApiRouteType.UPDATE: {
				customDecorators.push(ApiMethod({ action: EApiAction.UPDATE, entity: this.properties.entity, httpCode: HttpStatus.OK, method: RequestMethod.PUT, path: `:${this.ENTITY.primaryKey!.name}`, responses: { badRequest: true, internalServerError: true, notFound: true, unauthorized: true }, responseType: responseDto }));

				break;
			}

			case EApiRouteType.PARTIAL_UPDATE: {
				customDecorators.push(ApiMethod({ action: EApiAction.UPDATE, entity: this.properties.entity, httpCode: HttpStatus.OK, method: RequestMethod.PATCH, path: `:${this.ENTITY.primaryKey!.name}`, responses: { badRequest: true, internalServerError: true, notFound: true, unauthorized: true }, responseType: responseDto }));

				break;
			}

			case EApiRouteType.DELETE: {
				customDecorators.push(ApiMethod({ action: EApiAction.DELETE, entity: this.properties.entity, httpCode: HttpStatus.NO_CONTENT, method: RequestMethod.DELETE, path: `:${this.ENTITY.primaryKey!.name}`, responses: { internalServerError: true, notFound: true, unauthorized: true }, responseType: undefined }));

				break;
			}

			default: {
				throw ErrorException(`Method ${method as string} not implemented`);
			}
		}

		if (customDecorators.length > 0) {
			for (const decorator of customDecorators) {
				const descriptor: TypedPropertyDescriptor<any> | undefined = Reflect.getOwnPropertyDescriptor(targetMethod, methodName);
				(decorator as MethodDecorator | PropertyDecorator)(targetMethod, methodName, descriptor ?? { value: targetMethod });
			}
		}
	}

	applyMetadata(method: EApiRouteType, methodName: string, routeConfig: IApiControllerPropertiesRoute<E>): void {
		let parameterIndex: number = 0;
		let routeArgumentsMetadata: unknown = {};
		const parameterTypes: Array<any> = [];

		const requestDto: Type<unknown> | undefined = routeConfig.dto.request || DtoGenerate(this.properties.entity, this.ENTITY, method, EApiDtoType.REQUEST);
		const queryDto: Type<unknown> | undefined = routeConfig.dto.query || DtoGenerate(this.properties.entity, this.ENTITY, method, EApiDtoType.QUERY);
		const bodyDto: Type<unknown> | undefined = routeConfig.dto.body || DtoGenerate(this.properties.entity, this.ENTITY, method, EApiDtoType.BODY);

		if (requestDto) {
			routeArgumentsMetadata = assignMetadata(routeArgumentsMetadata, RouteParamtypes.PARAM, parameterIndex);
			parameterTypes.push(requestDto);
			parameterIndex++;
		}

		if (queryDto) {
			routeArgumentsMetadata = assignMetadata(routeArgumentsMetadata, RouteParamtypes.QUERY, parameterIndex);
			parameterTypes.push(queryDto);
			parameterIndex++;
		}

		if (bodyDto) {
			routeArgumentsMetadata = assignMetadata(routeArgumentsMetadata, RouteParamtypes.BODY, parameterIndex);
			parameterTypes.push(bodyDto);
			parameterIndex++;
		}

		Reflect.defineMetadata(ROUTE_ARGS_METADATA, routeArgumentsMetadata, this.target, methodName);
		Reflect.defineMetadata(PARAMTYPES_METADATA, parameterTypes, this.targetPrototype, methodName);
	}

	createMethod(method: EApiRouteType): void {
		if (this.properties.routes[method]) {
			const routeConfig: IApiControllerPropertiesRoute<E> = this.properties.routes[method];
			const routeDecorators: Array<MethodDecorator> | Array<PropertyDecorator> = routeConfig.decorators || [];
			ApiControllerWriteMethod(this as never, this.targetPrototype, method, this.properties.entity, this.ENTITY);
			const methodName: string = ApiControllerGetMethodName(method);

			this.applyMetadata(method, methodName, routeConfig);

			// Reflect.defineMetadata(PARAMTYPES_METADATA, [routeConfig.dto.request], this.target, methodNameOnController);
			// Reflect.defineMetadata(PATH_METADATA, `:${this.ENTITY.name}`, this.target, methodNameOnController);

			/* const dtoProperties: Record<string, unknown> = (Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, routeConfig.dto.request) || {}) as Record<string, unknown>;
            const dtoPropertiesArray: Array<unknown> = (Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, routeConfig.dto.request) || []) as Array<unknown>;

            Reflect.defineMetadata(DECORATORS.API_MODEL_PROPERTIES, dtoProperties, routeConfig.dto.request);
            Reflect.defineMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, dtoPropertiesArray, routeConfig.dto.request); */

			this.applyDecorators(method, methodName, routeConfig, routeDecorators);

			this.writeDtoToSwagger(method, routeConfig);

			Controller(this.properties.entity.name.toLowerCase())(this.target);
			ApiTags(this.properties.entity.name)(this.target);
		}
	}

	protected [EApiRouteType.CREATE](_method: EApiRouteType, methodName: string): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			function (this: { service: BaseApiService<E> }, properties: Partial<E>): Promise<E> {
				return this.service.create(properties);
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.DELETE](_method: EApiRouteType, methodName: string, _entity: IApiEntity, entityMetadata: IApiEntity): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			function (this: { service: BaseApiService<E> }, properties: ObjectLiteral): Promise<void> {
				const primaryKeyColumn: IApiEntityColumn | undefined = entityMetadata.columns.find((column: IApiEntityColumn) => column.isPrimary);

				if (!primaryKeyColumn) {
					throw ErrorException("Primary key not found in entity columns");
				}

				const primaryKeyValue: string = String(properties[primaryKeyColumn.name]);

				return this.service.delete(primaryKeyValue);
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.GET](method: EApiRouteType, methodName: string, entity: IApiBaseEntity, entityMetadata: IApiEntity): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: { service: BaseApiService<E> }, properties: ObjectLiteral): Promise<E> {
				try {
					const primaryKeyColumn: IApiEntityColumn | undefined = entityMetadata.columns.find((column: IApiEntityColumn) => column.isPrimary);

					if (!primaryKeyColumn) {
						throw ErrorException("Primary key not found in entity columns");
					}

					const primaryKeyValue: string = String(properties[primaryKeyColumn.name]);

					const response: E = await this.service.get(primaryKeyValue);
					const dto = DtoGenerate(entity, entityMetadata, method, EApiDtoType.RESPONSE);

					return plainToInstance(dto as ClassConstructor<E>, response, {
						excludeExtraneousValues: true,
					});
				} catch (error) {
					throw error;
				}
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.GET_LIST](_method: EApiRouteType, methodName: string): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			function (this: { service: BaseApiService<E> }, properties: TApiFunctionGetListProperties<E>): Promise<IApiGetListResponseResult<E>> {
				return this.service.getList(properties);
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.PARTIAL_UPDATE](_method: EApiRouteType, methodName: string, entity: IApiEntity): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			function (this: { service: BaseApiService<E> }, properties: ObjectLiteral, body: Partial<E>): Promise<E> {
				const primaryKeyColumn: IApiEntityColumn | undefined = entity.columns.find((column: IApiEntityColumn) => column.isPrimary);

				if (!primaryKeyColumn) {
					throw ErrorException("Primary key not found in entity columns");
				}

				const primaryKeyValue: string = String(properties[primaryKeyColumn.name]);

				return this.service.update(primaryKeyValue, body);
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.UPDATE](_method: EApiRouteType, methodName: string, entity: IApiEntity): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			function (this: { service: BaseApiService<E> }, properties: ObjectLiteral, body: Partial<E>): Promise<E> {
				const primaryKeyColumn: IApiEntityColumn | undefined = entity.columns.find((column: IApiEntityColumn) => column.isPrimary);

				if (!primaryKeyColumn) {
					throw ErrorException("Primary key not found in entity columns");
				}

				const primaryKeyValue: string = String(properties[primaryKeyColumn.name]);

				return this.service.update(primaryKeyValue, body);
			},
			"name",
			{ value: methodName },
		);
	}

	init(): void {
		for (const method of Object.values(EApiRouteType)) {
			if (this.properties.routes[method]) {
				this.createMethod(method);
			}
		}
	}

	writeDtoToSwagger(method: EApiRouteType, routeConfig: IApiControllerPropertiesRoute<E>): void {
		const swaggerModels: Array<unknown> = (Reflect.getMetadata(DECORATORS.API_EXTRA_MODELS, this.target) || []) as Array<unknown>;

		const requestDto: Type<unknown> | undefined = routeConfig.dto.request || DtoGenerate(this.properties.entity, this.ENTITY, method, EApiDtoType.REQUEST);
		const queryDto: Type<unknown> | undefined = routeConfig.dto.query || DtoGenerate(this.properties.entity, this.ENTITY, method, EApiDtoType.QUERY);
		const bodyDto: Type<unknown> | undefined = routeConfig.dto.body || DtoGenerate(this.properties.entity, this.ENTITY, method, EApiDtoType.BODY);
		const responseDto: Type<unknown> | undefined = routeConfig.dto.response || DtoGenerate(this.properties.entity, this.ENTITY, method, EApiDtoType.RESPONSE);

		const dtoList: Array<Type<unknown> | undefined> = [requestDto, queryDto, bodyDto, responseDto];

		for (const dto of dtoList) {
			if (dto && !swaggerModels.includes(dto)) {
				swaggerModels.push(dto);
				Reflect.defineMetadata(DECORATORS.API_EXTRA_MODELS, swaggerModels, this.target);
			}
		}
	}

	protected get targetPrototype(): InstanceType<typeof this.target> {
		return this.target.prototype as InstanceType<typeof this.target>;
	}
}
