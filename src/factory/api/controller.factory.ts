import type { Type } from "@nestjs/common";
import type { ClassConstructor } from "class-transformer";
import type { DeepPartial, FindOptionsOrder, FindOptionsWhere } from "typeorm";
import type { FindOperator } from "typeorm/find-options/FindOperator";

import type { IApiAuthenticationRequest, IApiControllerPrimaryColumn, IApiControllerProperties, IApiEntity, IApiGetListResponseResult } from "../../interface";
import type { TApiControllerGetListQuery, TApiControllerMethod, TApiControllerMethodMap, TApiControllerMethodName, TApiControllerMethodNameMap, TApiControllerPropertiesRoute, TApiControllerTargetMethod, TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetListPropertiesWhere, TApiFunctionGetProperties, TApiFunctionUpdateCriteria } from "../../type";

import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { Equal } from "typeorm";
import { ILike, In, IsNull, LessThan, Like, MoreThan, Not } from "typeorm";
import { Between, LessThanOrEqual, MoreThanOrEqual } from "typeorm";

import { CONTROLLER_API_DECORATOR_CONSTANT, FUNCTION_API_DECORATOR_CONSTANT } from "../../constant";
import { EApiDtoType, EApiRouteType } from "../../enum";
import { EFilterOperation } from "../../enum/filter-operation.enum";
import { ApiControllerTransformData, ApiControllerWriteDtoSwagger, ApiControllerWriteMethod, CapitalizeString, DtoGenerate, ErrorException, GenerateEntityInformation } from "../../utility";
import { ApiControllerApplyDecorators } from "../../utility/api/controller/apply-decorators.utility";
import { ApiControllerApplyMetadata } from "../../utility/api/controller/apply-metadata.utility";
import { ApiControllerGetPrimaryColumn } from "../../utility/api/controller/get-primary-column.utility";
import { ApiControllerHandleRequestRelations } from "../../utility/api/controller/handle-request-relations.utility";
import { ApiControllerValidateRequest } from "../../utility/api/controller/validate-request.utility";
import { analyzeEntityMetadata } from "../../utility/dto/analize.utility";

function transformFilter<E>(query: Record<string, any>): FindOptionsWhere<E> {
	const filter: FindOptionsWhere<E> = {};

	for (const fullKey of Object.keys(query)) {
		if (!fullKey.includes("[")) continue;

		const [key, field] = fullKey.split("[");
		const cleanField: string = field.replace("]", "");

		if (cleanField === "value") {
			const operation: EFilterOperation = query[`${key}[operator]`] as EFilterOperation;
			// eslint-disable-next-line @elsikora-typescript/no-unsafe-assignment
			const value: any = query[fullKey];

			if (!operation || !key) continue;

			// @ts-ignore
			filter[key as keyof E] = transformOperation(operation, value);
		}
	}

	return filter;
}

function transformOperation(operation: EFilterOperation, value: any): FindOperator<any> {
	switch (operation) {
		case EFilterOperation.BETWEEN: {
			const [start, end] = Array.isArray(value) ? value : [null, null];

			return Between(start, end);
		}

		case EFilterOperation.CONT: {
			return Like(`%${String(value)}%`);
		}

		case EFilterOperation.CONTL: {
			return ILike(`%${String(value)}%`);
		}

		case EFilterOperation.ENDS: {
			return Like(`%${String(value)}`);
		}

		case EFilterOperation.ENDSL: {
			return ILike(`%${String(value)}`);
		}

		case EFilterOperation.EQ: {
			return Equal(String(value));
		}

		case EFilterOperation.EQL: {
			return ILike(String(value));
		}

		case EFilterOperation.EXCL: {
			return Not(Like(`%${String(value)}%`));
		}

		case EFilterOperation.EXCLL: {
			return Not(ILike(`%${String(value)}%`));
		}

		case EFilterOperation.GT: {
			return MoreThan(String(value));
		}

		case EFilterOperation.GTE: {
			return MoreThanOrEqual(String(value));
		}

		case EFilterOperation.IN: {
			return In(Array.isArray(value) ? value : [value]);
		}

		case EFilterOperation.INL: {
			return In(Array.isArray(value) ? value.map((v) => ILike(v)) : [ILike(value)]);
		}

		case EFilterOperation.ISNULL: {
			return IsNull();
		}

		case EFilterOperation.LT: {
			return LessThan(String(value));
		}

		case EFilterOperation.LTE: {
			return LessThanOrEqual(String(value));
		}

		case EFilterOperation.NE: {
			return Not(String(value));
		}

		case EFilterOperation.NEL: {
			return Not(ILike(String(value)));
		}

		case EFilterOperation.NOTIN: {
			return Not(In(Array.isArray(value) ? value : [value]));
		}

		case EFilterOperation.NOTINL: {
			return Not(In(Array.isArray(value) ? value.map((v) => ILike(v)) : [ILike(value)]));
		}

		case EFilterOperation.NOTNULL: {
			return Not(IsNull());
		}

		case EFilterOperation.STARTS: {
			return Like(`${String(value)}%`);
		}

		case EFilterOperation.STARTSL: {
			return ILike(`${String(value)}%`);
		}
	}
}

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

		Controller(this.properties.path ?? this.properties.entity.name.toLowerCase())(this.target);
		ApiTags(this.properties.name ?? this.properties.entity.name)(this.target);
	}

	protected [EApiRouteType.CREATE](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.CREATE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<E> {
				try {
					const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(body, entityMetadata);

					if (!primaryKey) {
						throw ErrorException("Primary key not found in entity columns");
					}

					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { body }, { authenticationRequest, headers, ip });
					await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, body as Partial<E>);
					await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, body);

					const createResponse: E = await this.service.create(body);
					const dto: Type<unknown> | undefined = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);

					const requestProperties: TApiFunctionGetProperties<E> = {
						relations: properties.routes[method]?.response?.relations,
						where: {
							[primaryKey.key]: createResponse[primaryKey.key],
						} as FindOptionsWhere<E>,
					};

					const response: E = await this.service.get(requestProperties);

					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.response?.transformers, properties, { response }, { authenticationRequest, headers, ip });

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
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<void> {
				const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(parameters, entityMetadata);

				if (!primaryKey) {
					throw ErrorException("Primary key not found in entity columns");
				}

				ApiControllerTransformData<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { parameters }, { authenticationRequest, headers, ip });
				await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, parameters);
				await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, parameters);

				const requestCriteria: TApiFunctionDeleteCriteria<E> = {
					[primaryKey.key]: primaryKey.value,
				} as TApiFunctionDeleteCriteria<E>;

				await this.service.delete(requestCriteria);
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.GET](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.GET>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<E> {
				try {
					const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(parameters, entityMetadata);

					if (!primaryKey) {
						throw ErrorException("Primary key not found in entity columns");
					}

					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { parameters }, { authenticationRequest, headers, ip });
					await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, parameters);
					await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, parameters);

					const requestProperties: TApiFunctionGetProperties<E> = {
						relations: properties.routes[method]?.response?.relations,
						where: {
							[primaryKey.key]: primaryKey.value,
						} as FindOptionsWhere<E>,
					};

					const response: E = await this.service.get(requestProperties);

					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.response?.transformers, properties, { response }, { authenticationRequest, headers, ip });

					const dto: Type<unknown> | undefined = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);

					return plainToInstance(dto as ClassConstructor<E>, response, {
						excludeExtraneousValues: true,
					});
				} catch (error) {
					console.log("UEBANCHIK", error);

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
				try {
					console.log("CHERY BERRUY", query);
					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { query }, { authenticationRequest, headers, ip });
					await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, query);
					await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, query);

					const { limit, orderBy, orderDirection, page, ...getListQuery }: TApiControllerGetListQuery<E> = query;

					const filter: TApiFunctionGetListPropertiesWhere<E> = transformFilter<E>(getListQuery);

					console.log("PRE FILTER", getListQuery);

					const requestProperties: TApiFunctionGetListProperties<E> = {
						relations: properties.routes[method]?.response?.relations,
						skip: query.limit * (query.page - 1),
						take: query.limit,
						where: filter,
					};

					console.log("FILTER", requestProperties);
					console.log("FILTER WHERE", requestProperties.where);

					if (orderBy) {
						requestProperties.order = {
							[orderBy as never as string]: orderDirection ?? FUNCTION_API_DECORATOR_CONSTANT.DEFAULT_FILTER_ORDER_BY_DIRECTION,
						} as FindOptionsOrder<E>;
					}

					const response: IApiGetListResponseResult<E> = await this.service.getList(requestProperties);
					ApiControllerTransformData<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { response }, { authenticationRequest, headers, ip });

					const dto: Type<unknown> | undefined = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);

					return plainToInstance(dto as ClassConstructor<IApiGetListResponseResult<E>>, response, {
						excludeExtraneousValues: true,
					});
				} catch (error) {
					console.log("UEBANCHIK", error);

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
				const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(parameters, entityMetadata);

				if (!primaryKey) {
					throw ErrorException("Primary key not found in entity columns");
				}

				ApiControllerTransformData<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { body, parameters }, { authenticationRequest, headers, ip });
				await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, parameters);
				await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, parameters);

				const requestCriteria: TApiFunctionUpdateCriteria<E> = {
					[primaryKey.key]: primaryKey.value,
				} as TApiFunctionUpdateCriteria<E>;

				const response: E = await this.service.update(requestCriteria, body);

				ApiControllerTransformData<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { response }, { authenticationRequest, headers, ip });

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
	protected [EApiRouteType.UPDATE](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.UPDATE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<E> {
				const primaryKey: IApiControllerPrimaryColumn<E> | undefined = ApiControllerGetPrimaryColumn<E>(parameters, entityMetadata);

				if (!primaryKey) {
					throw ErrorException("Primary key not found in entity columns");
				}

				ApiControllerTransformData<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { body, parameters }, { authenticationRequest, headers, ip });
				await ApiControllerValidateRequest<E>(properties.routes[method]?.request?.validators, properties, parameters);
				await ApiControllerHandleRequestRelations<E>(this, properties, properties.routes[method]?.request?.relations, parameters);

				const requestCriteria: TApiFunctionUpdateCriteria<E> = {
					[primaryKey.key]: primaryKey.value,
				} as TApiFunctionUpdateCriteria<E>;

				const response: E = await this.service.update(requestCriteria, body);

				ApiControllerTransformData<E, typeof method>(properties.routes[method]?.request?.transformers, properties, { response }, { authenticationRequest, headers, ip });

				const dto: Type<unknown> | undefined = DtoGenerate(properties.entity, entityMetadata, method, EApiDtoType.RESPONSE, properties.routes[method]?.autoDto?.[EApiDtoType.RESPONSE], properties.routes[method]?.authentication?.guard);

				return plainToInstance(dto as ClassConstructor<E>, response, {
					excludeExtraneousValues: true,
				});
			},
			"name",
			{ value: methodName },
		);
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

	init(): void {
		for (const method of Object.values(EApiRouteType)) {
			this.createMethod(method);
		}
	}

	protected get targetPrototype(): InstanceType<typeof this.target> {
		return this.target.prototype as InstanceType<typeof this.target>;
	}
}
