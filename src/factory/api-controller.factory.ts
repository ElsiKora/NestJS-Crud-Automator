import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";
import type { IApiControllerReadPlan } from "@interface/class/api/controller/read";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { TApiControllerMethod } from "@type/class";
import type { TApiControllerConstructor, TApiControllerGetListQuery, TApiControllerGetListResponse, TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiControllerMethodMap, TApiControllerMethodName, TApiControllerMethodNameMap, TApiControllerTargetMethod } from "@type/factory/api/controller";
import type { DeepPartial } from "typeorm";

import { ApiControllerGetListQueryPlanCompiler } from "@class/api/controller/get-list/query";
import { ApiControllerIdentityPlanCompiler } from "@class/api/controller/identity-plan-compiler.class";
import { ApiControllerReadPlanCompiler } from "@class/api/controller/read-plan-compiler.class";
import { ApiControllerTableInheritancePlanCompiler } from "@class/api/controller/table-inheritance-plan-compiler.class";
import { ApiRouteRuntime } from "@class/api/route-runtime.class";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiRouteType } from "@enum/decorator/api";
import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiControllerGetMethodName, ApiControllerWriteMethod } from "@utility/api";
import { ApiControllerApplyDecoratorsWithIdentityPlan } from "@utility/api/controller/apply/decorators.utility";
import { ApiControllerApplyMetadataWithReadPlan } from "@utility/api/controller/apply/metadata.utility";
import { ApiControllerGetListQueryPlanGet, ApiControllerGetListQueryPlanSet } from "@utility/api/controller/get-list/query";
import { ApiControllerGetSchemaPrefix } from "@utility/api/controller/get/schema-prefix.utility";
import { ApiControllerIdentityPlanSet } from "@utility/api/controller/identity";
import { ApiControllerReadPlanGet, ApiControllerReadPlanSet } from "@utility/api/controller/read";
import { ApiControllerWriteDtoSwaggerWithReadPlan } from "@utility/api/controller/write/dto-swagger.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";

export class ApiControllerFactory<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> {
	private static readonly SCHEMA_PREFIX_OWNERS: Map<string, { controller: object; path: string }> = new Map<string, { controller: object; path: string }>();

	protected get targetPrototype(): InstanceType<TApiControllerTargetMethod<E, M>> {
		return this.target.prototype as InstanceType<TApiControllerTargetMethod<E, M>>;
	}

	private readonly ENTITY!: IApiEntity<E>;

	private readonly PATH: string;

	private schemaPrefix!: string;

	constructor(
		protected target: TApiControllerConstructor,
		private readonly properties: IApiControllerProperties<E>,
	) {
		this.PATH = this.properties.path ?? (this.properties.entity.name ? this.properties.entity.name.toLowerCase() : "UnknownResource");

		const entityInformation: IApiEntity<E> = GenerateEntityInformation<E>(properties.entity);

		this.ENTITY = { ...entityInformation, tableInheritance: ApiControllerTableInheritancePlanCompiler.compile(properties, entityInformation) };

		if (!this.ENTITY.primaryKey) {
			throw ErrorException(`Primary key for entity ${this.properties.entity.name ?? "UnknownResource"} not found`);
		}

		Controller(this.PATH)(this.target);
		ApiTags(this.properties.name ?? this.properties.entity.name ?? "UnknownResource")(this.target);

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.ENTITY_METADATA_KEY, this.properties.entity, this.target);
		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY, this.properties, this.target);
	}

	/**
	 * Fails startup when a child entity of the table inheritance root was loaded after the controller was decorated, since that variant would be missing from Swagger and response serialization.
	 * @returns {void}
	 */
	assertTableInheritanceChildren(): void {
		ApiControllerTableInheritancePlanCompiler.assertChildEntitiesLoaded(this.target.name, this.ENTITY.tableInheritance);
	}

	createMethod(method: EApiRouteType): void {
		if (!(method in this.properties.routes) || this.properties.routes[method]?.generation?.isEnabled !== false) {
			const routeConfig: TApiControllerPropertiesRoute<E, typeof method> = this.properties.routes[method] ?? {};
			const routeDecorators: Array<MethodDecorator> | Array<PropertyDecorator> = routeConfig.generation?.decorators ?? [];
			const methodName: TApiControllerMethodNameMap[typeof method] = ApiControllerGetMethodName(method);
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

			const targetMethod: TApiControllerMethodMap<E, M>[typeof method] = this.targetPrototype[methodName];

			if (identityPlan) {
				ApiControllerIdentityPlanSet(targetMethod, identityPlan);
			}

			ApiControllerApplyMetadataWithReadPlan(this.target, this.targetPrototype, this.ENTITY, this.properties, method, methodName, routeConfig, queryPlan, readPlan, identityPlan);

			if (this.properties.routes[method]?.generation?.shouldWriteToController !== false) {
				ApiControllerApplyDecoratorsWithIdentityPlan(targetMethod, this.ENTITY, this.properties, method, methodName, routeConfig, routeDecorators, this.schemaPrefix, queryPlan, identityPlan);
			}

			ApiControllerWriteDtoSwaggerWithReadPlan(this.target, this.ENTITY, this.properties, method, routeConfig, queryPlan, readPlan, identityPlan);
		}
	}

	init(): void {
		this.schemaPrefix = this.claimSchemaPrefix();

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
				async function (this: TApiControllerMethod<E>, parameters: Partial<E>, query: TApiControllerGetListQuery<E, M>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<TApiControllerGetListResponse<E, M>> {
					const requestQueryValue: unknown = authenticationRequest && "query" in authenticationRequest ? authenticationRequest.query : undefined;
					const requestQuery: TApiControllerGetListQuery<E, M> | undefined = requestQueryValue && typeof requestQueryValue === "object" && !Array.isArray(requestQueryValue) ? (requestQueryValue as TApiControllerGetListQuery<E, M>) : undefined;
					const queryPlan: IApiControllerGetListQueryPlan | undefined = ApiControllerGetListQueryPlanGet(Object.getPrototypeOf(this) as object, methodName);
					const runtimeQuery: TApiControllerGetListQuery<E, M> = queryPlan && !queryPlan.filter.isLegacy && requestQuery ? requestQuery : query;

					return (await ApiRouteRuntime.executeGenerated({ controller: this, entityMetadata, method, methodName, properties, targets: { authenticationRequest, headers, ip, parameters, query: runtimeQuery as TApiControllerGetListQuery<E, EApiControllerGetListQueryPaginationMode> } })) as TApiControllerGetListResponse<E, M>;
				},
				"name",
				{ value: methodName },
			) as unknown as TApiControllerMethodMap<E, M>[EApiRouteType.GET_LIST];

			return;
		}

		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, query: TApiControllerGetListQuery<E, M>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<TApiControllerGetListResponse<E, M>> {
				const requestQueryValue: unknown = authenticationRequest && "query" in authenticationRequest ? authenticationRequest.query : undefined;
				const requestQuery: TApiControllerGetListQuery<E, M> | undefined = requestQueryValue && typeof requestQueryValue === "object" && !Array.isArray(requestQueryValue) ? (requestQueryValue as TApiControllerGetListQuery<E, M>) : undefined;
				const queryPlan: IApiControllerGetListQueryPlan | undefined = ApiControllerGetListQueryPlanGet(Object.getPrototypeOf(this) as object, methodName);
				const runtimeQuery: TApiControllerGetListQuery<E, M> = queryPlan && !queryPlan.filter.isLegacy && requestQuery ? requestQuery : query;

				return (await ApiRouteRuntime.executeGenerated({ controller: this, entityMetadata, method, methodName, properties, targets: { authenticationRequest, headers, ip, query: runtimeQuery as TApiControllerGetListQuery<E, EApiControllerGetListQueryPaginationMode> } })) as TApiControllerGetListResponse<E, M>;
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

	/**
	 * Claims the schema prefix of the decorated controller class, which starts every generated DTO and OpenAPI component name.
	 * Fails startup when the class has no name or another controller class already has the same prefix, since their generated DTOs would share component names.
	 * @returns {string} The schema prefix of the controller.
	 * @throws {Error} When the controller class has no name or its schema prefix belongs to another controller class.
	 */
	private claimSchemaPrefix(): string {
		if (this.target.name.length === 0) {
			throw ErrorException(`Controller with path "${this.PATH}" is an anonymous class. Declare a named controller class, because its name starts every generated DTO and OpenAPI component name`);
		}

		const schemaPrefix: string = ApiControllerGetSchemaPrefix(this.target);
		const owner: { controller: object; path: string } | undefined = ApiControllerFactory.SCHEMA_PREFIX_OWNERS.get(schemaPrefix);

		if (owner && owner.controller !== this.target) {
			throw ErrorException(`Controllers ${(owner.controller as { name: string }).name} (path "${owner.path}") and ${this.target.name} (path "${this.PATH}") have the same schema prefix "${schemaPrefix}". Rename one of the controller classes, because the prefix starts every generated DTO and OpenAPI component name`);
		}

		ApiControllerFactory.SCHEMA_PREFIX_OWNERS.set(schemaPrefix, { controller: this.target, path: this.PATH });

		return schemaPrefix;
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
