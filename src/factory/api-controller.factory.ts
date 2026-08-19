import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";
import type { IApiControllerReadPlan } from "@interface/class/api/controller/read";
import type { IApiControllerProperties, IApiGetListResponseResult } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { TApiControllerMethod } from "@type/class";
import type { TApiControllerGetListQuery, TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiControllerMethodMap, TApiControllerMethodName, TApiControllerMethodNameMap, TApiControllerTargetMethod } from "@type/factory/api/controller";
import type { DeepPartial } from "typeorm";

import { ApiControllerGetListQueryPlanCompiler } from "@class/api/controller/get-list/query";
import { ApiControllerIdentityPlanCompiler } from "@class/api/controller/identity-plan-compiler.class";
import { ApiControllerReadPlanCompiler } from "@class/api/controller/read";
import { ApiRouteRuntime } from "@class/api/route-runtime.class";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiRouteType } from "@enum/decorator/api";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiControllerGetMethodName, ApiControllerWriteMethod } from "@utility/api";
import { ApiControllerApplyDecoratorsWithIdentityPlan } from "@utility/api/controller/apply/decorators.utility";
import { ApiControllerApplyMetadataWithReadPlan } from "@utility/api/controller/apply/metadata.utility";
import { ApiControllerGetListQueryPlanGet, ApiControllerGetListQueryPlanSet } from "@utility/api/controller/get-list/query";
import { ApiControllerIdentityPlanSet } from "@utility/api/controller/identity";
import { ApiControllerReadPlanGet, ApiControllerReadPlanSet } from "@utility/api/controller/read";
import { ApiControllerWriteDtoSwaggerWithReadPlan } from "@utility/api/controller/write/dto-swagger.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";

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

		if (!this.ENTITY.primaryKey) {
			throw ErrorException(`Primary key for entity ${this.properties.entity.name ?? "UnknownResource"} not found`);
		}

		Controller(this.properties.path ?? (this.properties.entity.name ? this.properties.entity.name.toLowerCase() : "UnknownResource"))(this.target);
		ApiTags(this.properties.name ?? this.properties.entity.name ?? "UnknownResource")(this.target);

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.ENTITY_METADATA_KEY, this.properties.entity, this.target);
		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY, this.properties, this.target);
	}

	createMethod(method: EApiRouteType): void {
		if (!(method in this.properties.routes) || this.properties.routes[method]?.generation?.isEnabled !== false) {
			const routeConfig: TApiControllerPropertiesRoute<E, typeof method> = this.properties.routes[method] ?? {};
			const routeDecorators: Array<MethodDecorator> | Array<PropertyDecorator> = routeConfig.generation?.decorators ?? [];
			const methodName: TApiControllerMethodNameMap[typeof method] = ApiControllerGetMethodName(method) as TApiControllerMethodNameMap[typeof method];
			let queryPlan: IApiControllerGetListQueryPlan | undefined;
			const readPlan: IApiControllerReadPlan | undefined = ApiControllerReadPlanCompiler.compile(this.target, this.properties.path, this.ENTITY, method, routeConfig);
			const identityPlan: IApiControllerIdentityPlan | undefined = ApiControllerIdentityPlanCompiler.compile(this.target, this.properties.path, this.ENTITY, method, routeConfig, readPlan);

			if (readPlan) {
				ApiControllerReadPlanSet(this.targetPrototype, methodName, readPlan);
			}

			ApiControllerWriteMethod<E>(this as never, this.targetPrototype, method, this.properties, this.ENTITY);

			if (method === EApiRouteType.GET_LIST) {
				queryPlan = ApiControllerGetListQueryPlanCompiler.compile(this.target, this.properties.entity, this.ENTITY, routeConfig as TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>);

				if (queryPlan) {
					ApiControllerGetListQueryPlanSet(this.targetPrototype, methodName, queryPlan);
				}
			}

			const targetMethod: TApiControllerMethodMap<E>[typeof method] = this.targetPrototype[methodName] as TApiControllerMethodMap<E>[typeof method];

			if (identityPlan) {
				ApiControllerIdentityPlanSet(targetMethod, identityPlan);
			}

			ApiControllerApplyMetadataWithReadPlan(this.target, this.targetPrototype, this.ENTITY, this.properties, method, methodName, routeConfig, queryPlan, readPlan, identityPlan);

			if (this.properties.routes[method]?.generation?.shouldWriteToController !== false) {
				ApiControllerApplyDecoratorsWithIdentityPlan(targetMethod, this.ENTITY, this.properties, method, methodName, routeConfig, routeDecorators, queryPlan, identityPlan);
			}

			ApiControllerWriteDtoSwaggerWithReadPlan(this.target, this.ENTITY, this.properties, method, routeConfig, this.ENTITY, queryPlan, readPlan, identityPlan);
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
				return (await ApiRouteRuntime.executeGenerated({ controller: this, entityMetadata, method, methodName, properties, targets: { authenticationRequest, body, headers, ip } })) as E;
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.DELETE](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.DELETE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<void> {
				await ApiRouteRuntime.executeGenerated({ controller: this, entityMetadata, method, methodName, properties, targets: { authenticationRequest, headers, ip, parameters } });
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.GET](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.GET>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<E> {
				return (await ApiRouteRuntime.executeGenerated({ controller: this, entityMetadata, method, methodName, properties, targets: { authenticationRequest, headers, ip, parameters } })) as E;
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.GET_LIST](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.GET_LIST>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		const readPlan: IApiControllerReadPlan | undefined = ApiControllerReadPlanGet(this.targetPrototype, methodName);

		if (readPlan) {
			this.targetPrototype[methodName] = Object.defineProperty(
				async function (this: TApiControllerMethod<E>, parameters: Partial<E>, query: TApiControllerGetListQuery<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<IApiGetListResponseResult<E>> {
					const requestQueryValue: unknown = authenticationRequest && "query" in authenticationRequest ? authenticationRequest.query : undefined;
					const requestQuery: TApiControllerGetListQuery<E> | undefined = requestQueryValue && typeof requestQueryValue === "object" && !Array.isArray(requestQueryValue) ? (requestQueryValue as TApiControllerGetListQuery<E>) : undefined;
					const queryPlan: IApiControllerGetListQueryPlan | undefined = ApiControllerGetListQueryPlanGet(Object.getPrototypeOf(this) as object, methodName);
					const runtimeQuery: TApiControllerGetListQuery<E> = queryPlan && !queryPlan.filter.isLegacy && requestQuery ? requestQuery : query;

					return (await ApiRouteRuntime.executeGenerated({ controller: this, entityMetadata, method, methodName, properties, targets: { authenticationRequest, headers, ip, parameters, query: runtimeQuery } })) as IApiGetListResponseResult<E>;
				},
				"name",
				{ value: methodName },
			) as unknown as TApiControllerMethodMap<E>[EApiRouteType.GET_LIST];

			return;
		}

		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, query: TApiControllerGetListQuery<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<IApiGetListResponseResult<E>> {
				const requestQueryValue: unknown = authenticationRequest && "query" in authenticationRequest ? authenticationRequest.query : undefined;
				const requestQuery: TApiControllerGetListQuery<E> | undefined = requestQueryValue && typeof requestQueryValue === "object" && !Array.isArray(requestQueryValue) ? (requestQueryValue as TApiControllerGetListQuery<E>) : undefined;
				const queryPlan: IApiControllerGetListQueryPlan | undefined = ApiControllerGetListQueryPlanGet(Object.getPrototypeOf(this) as object, methodName);
				const runtimeQuery: TApiControllerGetListQuery<E> = queryPlan && !queryPlan.filter.isLegacy && requestQuery ? requestQuery : query;

				return (await ApiRouteRuntime.executeGenerated({ controller: this, entityMetadata, method, methodName, properties, targets: { authenticationRequest, headers, ip, query: runtimeQuery } })) as IApiGetListResponseResult<E>;
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.PARTIAL_UPDATE](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.PARTIAL_UPDATE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.defineUpdateRouteMethod(method, methodName, properties, entityMetadata);
	}

	protected [EApiRouteType.UPDATE](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.UPDATE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.defineUpdateRouteMethod(method, methodName, properties, entityMetadata);
	}

	private defineUpdateRouteMethod(method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.PARTIAL_UPDATE> | TApiControllerMethodName<typeof EApiRouteType.UPDATE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<E> {
				return (await ApiRouteRuntime.executeGenerated({ controller: this, entityMetadata, method, methodName, properties, targets: { authenticationRequest, body, headers, ip, parameters } })) as E;
			},
			"name",
			{ value: methodName },
		);
	}
}
