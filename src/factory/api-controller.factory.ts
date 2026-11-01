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
import type { DeepPartial, Repository } from "typeorm";

import { ApiControllerGetListQueryPlanCompiler } from "@class/api/controller/get-list/query";
import { ApiControllerIdentityPlanCompiler } from "@class/api/controller/identity-plan-compiler.class";
import { ApiControllerReadPlanCompiler } from "@class/api/controller/read-plan-compiler.class";
import { ApiControllerRequestRelationsValidator } from "@class/api/controller/request-relations-validator.class";
import { ApiControllerSchemaNameCheck } from "@class/api/controller/schema-name-check.class";
import { ApiControllerTableInheritancePlanCompiler } from "@class/api/controller/table-inheritance-plan-compiler.class";
import { ApiRouteRuntime } from "@class/api/route-runtime.class";
import { API_CONTROLLER_TESTING_GUIDE_URL } from "@constant/api-controller-testing-guide.constant";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { DTO_SCHEMA_NAME_CONSTANT } from "@constant/utility/dto/schema-name.constant";
import { EApiRouteType } from "@enum/decorator/api";
import { Controller, UseFilters } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiControllerGetMethodName, ApiControllerWriteMethod } from "@utility/api";
import { ApiControllerApplyDecoratorsWithIdentityPlan } from "@utility/api/controller/apply/decorators.utility";
import { ApiControllerApplyMetadataWithReadPlan } from "@utility/api/controller/apply/metadata.utility";
import { ApiControllerAssertRouteCursorDataSource, ApiControllerAssertRouteRelationLoads } from "@utility/api/controller/assert";
import { ApiControllerAssertRepositoryEntity } from "@utility/api/controller/assert-repository-entity.utility";
import { ApiControllerGetListQueryPlanSet } from "@utility/api/controller/get-list/query";
import { ApiControllerGetListTransformAssertRelationTargets } from "@utility/api/controller/get-list/transform/assert-relation-targets.utility";
import { ApiControllerGetSchemaPrefix } from "@utility/api/controller/get/schema-prefix.utility";
import { ApiControllerIdentityPlanSet } from "@utility/api/controller/identity";
import { ApiControllerReadPlanGet, ApiControllerReadPlanSet } from "@utility/api/controller/read";
import { ApiControllerWriteDtoSwaggerWithReadPlan } from "@utility/api/controller/write/dto-swagger.utility";
import { ApiRouteRebindInheritedCustom } from "@utility/api/route/rebind-inherited-custom.utility";
import { DatabaseTypeOrmAssertServiceRepository } from "@utility/database/typeorm/assert/service-repository.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";

export class ApiControllerFactory<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> {
	private static readonly GENERATED_METHODS: WeakSet<object> = new WeakSet<object>();

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
	 * Fails startup when a relation target the GET_LIST route can filter by became ambiguous after the controller was decorated, so the outcome does not depend on import order.
	 * @returns {void}
	 */
	assertGetListRelationTargets(): void {
		const routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST> | undefined = this.properties.routes[EApiRouteType.GET_LIST];

		if (routeConfig?.generation?.isEnabled !== false) {
			ApiControllerGetListTransformAssertRelationTargets(this.ENTITY, routeConfig?.security?.authentication?.guard);
		}
	}

	/**
	 * Fails startup when the manual GET_LIST response of a PAGE route cannot be read or leaves out a typed order field. The read waits until here because the response's lazy types may name classes that did not exist while the controller was decorated.
	 * @returns {void}
	 */
	assertListResponseOrder(): void {
		const routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST> | undefined = this.properties.routes[EApiRouteType.GET_LIST];

		if (routeConfig && routeConfig.generation?.isEnabled !== false) {
			ApiControllerGetListQueryPlanCompiler.assertOrderFieldsPublished(this.target, this.properties.entity, this.ENTITY, routeConfig);
		}
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

			ApiControllerRequestRelationsValidator.register<E>(this.targetPrototype, this.properties.entity, `Controller ${this.target.name} route ${method}`, routeConfig.relations?.request, routeConfig.transaction?.mode);

			const readPlan: IApiControllerReadPlan | undefined = ApiControllerReadPlanCompiler.compile(this.target, this.properties.path, this.ENTITY, method, routeConfig);
			const identityPlan: IApiControllerIdentityPlan | undefined = ApiControllerIdentityPlanCompiler.compile(this.target, this.properties.path, this.ENTITY, method, routeConfig, readPlan);

			if (readPlan) {
				ApiControllerReadPlanSet(this.targetPrototype, methodName, readPlan);
			}

			ApiControllerWriteMethod<E>(this as never, this.targetPrototype, method, this.properties, this.ENTITY);

			if (method === EApiRouteType.GET_LIST) {
				queryPlan = ApiControllerGetListQueryPlanCompiler.compile(this.target, this.properties.entity, this.ENTITY, routeConfig as TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>);
				ApiControllerGetListTransformAssertRelationTargets(this.ENTITY, routeConfig.security?.authentication?.guard);

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
			ApiControllerFactory.GENERATED_METHODS.add(targetMethod);
		} else {
			this.hideInheritedGeneratedRoute(method);
		}
	}

	init(): void {
		this.schemaPrefix = this.claimSchemaPrefix();
		ApiRouteRebindInheritedCustom(this.target);

		for (const method of Object.values(EApiRouteType)) {
			this.createMethod(method);
		}
	}

	/**
	 * Installs the startup checks on the target's own prototype in front of the hook it already has.
	 * The class the decorator returns inherits them, so they run exactly once whether Nest receives that class or the decorated target.
	 * @returns {void}
	 */
	installBootstrapChecks(): void {
		const assertBootstrap = (controller: object): void => {
			this.assertBootstrap(controller);
		};
		const controllerHook: unknown = Reflect.get(this.targetPrototype, "onApplicationBootstrap");

		Reflect.set(this.targetPrototype, "onApplicationBootstrap", async function (this: object): Promise<void> {
			assertBootstrap(this);

			if (typeof controllerHook === "function") {
				await Reflect.apply(controllerHook, this, []);
			}
		});
	}

	protected [EApiRouteType.CREATE](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.CREATE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		const schemaPrefix: string = this.schemaPrefix;

		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<E> {
				return (await ApiRouteRuntime.executeGenerated({ controller: this, entityMetadata, method, methodName, properties, schemaPrefix, targets: { authenticationRequest, body, headers, ip } })) as E;
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.DELETE](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.DELETE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		const schemaPrefix: string = this.schemaPrefix;

		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<void> {
				await ApiRouteRuntime.executeGenerated({ controller: this, entityMetadata, method, methodName, properties, schemaPrefix, targets: { authenticationRequest, headers, ip, parameters } });
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.GET](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.GET>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		const schemaPrefix: string = this.schemaPrefix;

		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<E> {
				return (await ApiRouteRuntime.executeGenerated({ controller: this, entityMetadata, method, methodName, properties, schemaPrefix, targets: { authenticationRequest, headers, ip, parameters } })) as E;
			},
			"name",
			{ value: methodName },
		);
	}

	protected [EApiRouteType.GET_LIST](method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.GET_LIST>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		const schemaPrefix: string = this.schemaPrefix;

		const readPlan: IApiControllerReadPlan | undefined = ApiControllerReadPlanGet(this.targetPrototype, methodName);

		if (readPlan) {
			this.targetPrototype[methodName] = Object.defineProperty(
				async function (this: TApiControllerMethod<E>, parameters: Partial<E>, query: TApiControllerGetListQuery<E, M>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<TApiControllerGetListResponse<E, M>> {
					const requestQueryValue: unknown = authenticationRequest && "query" in authenticationRequest ? authenticationRequest.query : undefined;
					const requestQuery: TApiControllerGetListQuery<E, M> | undefined = requestQueryValue && typeof requestQueryValue === "object" && !Array.isArray(requestQueryValue) ? (requestQueryValue as TApiControllerGetListQuery<E, M>) : undefined;
					const runtimeQuery: TApiControllerGetListQuery<E, M> = requestQuery ?? query;

					return (await ApiRouteRuntime.executeGenerated({ controller: this, entityMetadata, method, methodName, properties, schemaPrefix, targets: { authenticationRequest, headers, ip, parameters, query: runtimeQuery as TApiControllerGetListQuery<E, EApiControllerGetListQueryPaginationMode> } })) as TApiControllerGetListResponse<E, M>;
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
				const runtimeQuery: TApiControllerGetListQuery<E, M> = requestQuery ?? query;

				return (await ApiRouteRuntime.executeGenerated({ controller: this, entityMetadata, method, methodName, properties, schemaPrefix, targets: { authenticationRequest, headers, ip, query: runtimeQuery as TApiControllerGetListQuery<E, EApiControllerGetListQueryPaginationMode> } })) as TApiControllerGetListResponse<E, M>;
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
	 * Validates the table inheritance children and, when a generated route is enabled, the service repository, the route relation loads, and a CURSOR route's database contract against the initialized data source.
	 * @param {object} controller - The controller instance Nest bootstraps
	 * @throws {Error} When the controller cannot serve its routes on the active data source
	 */
	private assertBootstrap(controller: object): void {
		this.assertTableInheritanceChildren();

		// With every generated route disabled nothing reads through the repository, and the relation load and CURSOR checks skip a disabled route.
		if (!Object.values(EApiRouteType).some((routeType: EApiRouteType): boolean => this.properties.routes[routeType]?.generation?.isEnabled !== false)) {
			return;
		}

		const repository: Repository<E> = DatabaseTypeOrmAssertServiceRepository<E>(Reflect.get(controller, "service"), `Controller "${this.target.name}" of entity "${this.properties.entity.name}"`, `. In tests, use a repository of an in-memory DataSource and stub its methods: ${API_CONTROLLER_TESTING_GUIDE_URL}`);

		ApiControllerAssertRepositoryEntity(this.properties.entity, repository, this.target.name);

		for (const routeType of Object.values(EApiRouteType)) {
			ApiControllerAssertRouteRelationLoads(repository, this.properties.routes[routeType], `Controller "${this.target.name}" route "${routeType}"`);
		}

		ApiControllerAssertRouteCursorDataSource(this.targetPrototype, repository, this.properties.routes[EApiRouteType.GET_LIST], `Controller "${this.target.name}" route "${EApiRouteType.GET_LIST}"`);
	}

	/**
	 * Resolves the schema prefix of the decorated controller class, which starts every generated DTO and OpenAPI component name,
	 * marks the class as the owner of the prefix, and attaches the check that compares the controllers of each application at bootstrap.
	 * The routes read the resolved prefix at runtime, so a subclass or mixin of the decorated class serializes with the DTOs that the document shows.
	 * @returns {string} The schema prefix of the controller.
	 * @throws {Error} When the controller class has no name.
	 */
	private claimSchemaPrefix(): string {
		if (this.target.name.length === 0) {
			throw ErrorException(`Controller with path "${this.PATH}" is an anonymous class. Declare a named controller class, because its name starts every generated DTO and OpenAPI component name`);
		}

		Reflect.defineMetadata(DTO_SCHEMA_NAME_CONSTANT.CONTROLLER_METADATA_KEY, this.target, this.target);
		UseFilters(ApiControllerSchemaNameCheck)(this.target);

		return ApiControllerGetSchemaPrefix(this.target);
	}

	private defineUpdateRouteMethod(method: EApiRouteType, methodName: TApiControllerMethodName<typeof EApiRouteType.PARTIAL_UPDATE> | TApiControllerMethodName<typeof EApiRouteType.UPDATE>, properties: IApiControllerProperties<E>, entityMetadata: IApiEntity<E>): void {
		const schemaPrefix: string = this.schemaPrefix;

		this.targetPrototype[methodName] = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, parameters: Partial<E>, body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest): Promise<E> {
				return (await ApiRouteRuntime.executeGenerated({ controller: this, entityMetadata, method, methodName, properties, schemaPrefix, targets: { authenticationRequest, body, headers, ip, parameters } })) as E;
			},
			"name",
			{ value: methodName },
		);
	}

	/**
	 * Keeps a route disabled on this controller from being served through a parent controller that generates it.
	 * Nest serves the closest definition of a method name, so a definition without route metadata hides the parent route. The parent handler stays callable from the controller. A method that the controller or its base classes declare themselves is left alone.
	 * @param {EApiRouteType} method - Disabled route type.
	 * @returns {void}
	 */
	private hideInheritedGeneratedRoute(method: EApiRouteType): void {
		const methodName: string = ApiControllerGetMethodName(method);
		let definingPrototype: null | object = this.targetPrototype;

		while (definingPrototype && !Object.hasOwn(definingPrototype, methodName)) {
			definingPrototype = Object.getPrototypeOf(definingPrototype) as null | object;
		}

		const inheritedMethod: unknown = definingPrototype ? Object.getOwnPropertyDescriptor(definingPrototype, methodName)?.value : undefined;

		if (typeof inheritedMethod !== "function" || !ApiControllerFactory.GENERATED_METHODS.has(inheritedMethod)) {
			return;
		}

		const generatedMethod: (...methodArguments: Array<unknown>) => unknown = inheritedMethod as (...methodArguments: Array<unknown>) => unknown;

		Object.defineProperty(this.targetPrototype, methodName, {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			configurable: true,
			value: Object.defineProperty(
				function (this: unknown, ...methodArguments: Array<unknown>): unknown {
					return generatedMethod.apply(this, methodArguments);
				},
				"name",
				{ value: methodName },
			),
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			writable: true,
		});
	}
}
