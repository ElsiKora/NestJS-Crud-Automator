import type { IApiAuthorizationIamQueryField, IApiAuthorizationModuleOptions } from "@interface/class/api/authorization";
import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";
import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";
import type { IApiRouteRuntimeProperties } from "@interface/decorator/api";
import type { Type } from "@nestjs/common";
import type { InstanceWrapper } from "@nestjs/core/internal";

import { ApiAuthorizationHookPermissionCache } from "@class/api/authorization/hook";
import { ApiAuthorizationIamAttachmentCache, ApiAuthorizationIamDialectRegistry, ApiAuthorizationIamDocumentCache, ApiAuthorizationIamResourceDefinitionRegistry } from "@class/api/authorization/iam";
import { ApiAuthorizationParametersRuleRegistry } from "@class/api/authorization/parameters-rule-registry.class";
import { ApiAuthorizationPolicyRegistry } from "@class/api/authorization/policy/registry.class";
import { AUTHORIZATION_GATEWAY_METADATA_CONSTANT, AUTHORIZATION_MICROSERVICE_METADATA_CONSTANT, AUTHORIZATION_MODULE_OPTIONS_TOKEN, AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN } from "@constant/class/authorization";
import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { EApiAuthorizationMode } from "@enum/class/authorization";
import { EApiDtoType } from "@enum/decorator/api";
import { EApiRouteType } from "@enum/decorator/api/route";
import { IApiBaseEntity } from "@interface/api-base-entity.interface";
import { IApiControllerProperties, IApiRouteMetadata } from "@interface/decorator/api";
import { Inject, Injectable, OnApplicationBootstrap, Optional, RequestMethod, ValidationPipe } from "@nestjs/common";
import { addLeadingSlash, METHOD_METADATA, MODULE_PATH, PATH_METADATA, stripEndSlash, VERSION_METADATA } from "@nestjs/common/internal";
import { ApplicationConfig, DiscoveryService, HttpAdapterHost, MetadataScanner, ModulesContainer } from "@nestjs/core";
import { ApiControllerIdentityPlanGet } from "@utility/api/controller/identity/plan/get.utility";
import { ApiControllerParametersAssertComparableColumns } from "@utility/api/controller/parameters/custom-rule.utility";
import { ApiControllerParametersDtoGet } from "@utility/api/controller/parameters/dto";
import { ApiControllerParametersAssertHandlerArguments } from "@utility/api/controller/parameters/handler-arguments.utility";
import { ApiControllerParametersReadPath } from "@utility/api/controller/parameters/read-path.utility";
import { ApiControllerParametersAssertResourcePathPlaceholders } from "@utility/api/controller/parameters/resource-path.utility";
import { ApiControllerParametersBuildRouteRule } from "@utility/api/controller/parameters/route-rule.utility";
import { ApiControllerParametersAssertValidationPipePackages, ApiControllerParametersReadValidationPipes } from "@utility/api/controller/parameters/validation-pipe.utility";
import { AuthorizationIamReadQueryField } from "@utility/authorization/iam-query-field.utility";
import { AuthorizationIsHandlerAuthorized } from "@utility/authorization/is-handler-authorized.utility";
import { DatabaseTypeOrmIsRepository } from "@utility/database/typeorm/is/repository.utility";
import { DtoRequestWireBindController } from "@utility/dto/request-wire/bind";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";
import { getMetadataStorage } from "class-validator";
import { InstanceChecker } from "typeorm";

const authorizationBootstrapValidationLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationBootstrapValidationService");

@Injectable()
export class ApiAuthorizationBootstrapValidationService implements OnApplicationBootstrap {
	// Checks that need a pipe to run, collected while the routes are read and run once all routes are read.
	private pipeProbes: Array<() => Promise<void>> = [];

	public constructor(
		private readonly discoveryService: DiscoveryService,
		private readonly metadataScanner: MetadataScanner,
		private readonly modulesContainer: ModulesContainer,
		private readonly policyRegistry: ApiAuthorizationPolicyRegistry,
		private readonly hookPermissionCache: ApiAuthorizationHookPermissionCache,
		private readonly iamAttachmentCache: ApiAuthorizationIamAttachmentCache,
		private readonly iamDocumentCache: ApiAuthorizationIamDocumentCache,
		@Inject(AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN)
		@Optional()
		private readonly documentSources: ReadonlyArray<unknown> = [],
		@Inject(AUTHORIZATION_MODULE_OPTIONS_TOKEN)
		@Optional()
		private readonly moduleOptions: IApiAuthorizationModuleOptions = {},
		private readonly parametersRuleRegistry: ApiAuthorizationParametersRuleRegistry,
		@Optional()
		private readonly applicationConfig?: ApplicationConfig,
		@Optional()
		private readonly httpAdapterHost?: HttpAdapterHost,
		@Optional()
		private readonly iamDialectRegistry?: ApiAuthorizationIamDialectRegistry,
	) {
		// A manual `new` without the registry, from JavaScript or through a cast, fails here instead of on the first start.
		if (!(parametersRuleRegistry instanceof ApiAuthorizationParametersRuleRegistry)) {
			throw ErrorException("ApiAuthorizationBootstrapValidationService needs ApiAuthorizationParametersRuleRegistry: resolve it from ApiAuthorizationModule or pass the registry to the constructor");
		}
	}

	/**
	 * Validates every securable controller and records what the guard compares each request with.
	 * It returns a promise only when a route runs `ValidationPipe` from `@UsePipes`, whose packages are checked by running it, so a failure without one is thrown at once.
	 * @returns {Promise<void> | void} A promise when a pipe check is pending.
	 */
	public onApplicationBootstrap(): Promise<void> | void {
		this.pipeProbes = [];
		this.hookPermissionCache.configure(this.moduleOptions.cache);
		this.iamAttachmentCache.configure(this.moduleOptions.cache);
		this.iamDocumentCache.configure(this.moduleOptions.cache);
		this.parametersRuleRegistry.clear();
		this.iamDialectRegistry?.clear();
		const controllerWrappers: Array<InstanceWrapper> = this.discoveryService.getControllers();

		// Before the path value samples run: a PARAMETERS DTO converts its path text only once a route binds it, and a plain Nest route binds its DTOs only here.
		for (const controllerWrapper of controllerWrappers) {
			if (controllerWrapper.metatype) {
				DtoRequestWireBindController(controllerWrapper.metatype);
			}
		}

		authorizationBootstrapValidationLogger.verbose(`Starting authorization bootstrap validation for ${controllerWrappers.length} controllers.`);

		for (const controllerWrapper of controllerWrappers) {
			this.validateController(controllerWrapper);
		}

		const pipeProbes: Array<() => Promise<void>> = this.pipeProbes;
		this.pipeProbes = [];

		if (pipeProbes.length === 0) {
			this.finishStartupChecks();

			return;
		}

		return Promise.all(pipeProbes.map(async (probe: () => Promise<void>): Promise<void> => probe())).then((): void => {
			this.finishStartupChecks();
		});
	}

	/**
	 * Checks every route of a securable controller against its whole path: the global prefix, the `RouterModule` path, the controller path, and the route path. Each path parameter must reach a policy and the handler as the text authorization checked, so:
	 * - a wildcard in any part of the path fails startup, because its value has no name a PARAMETERS DTO can describe;
	 * - a generated route must describe every path parameter in its generated PARAMETERS DTO;
	 * - a custom route, IAM or HOOKS, gets the rule of its PARAMETERS DTO, which must describe every path parameter, with a column type on a HOOKS route;
	 * - an IAM route, generated or custom, that neither lists nor creates must carry each resource path placeholder as a path parameter;
	 * - a handler argument or a `@UsePipes` pipe that converts a path value by another rule fails startup.
	 * The parameters of each route are recorded, so the guard refuses a request that carries another one. The rule is built and kept for this controller class: a handler inherited from a base class is shared with its other subclasses, whose resource paths may differ.
	 * @param {InstanceWrapper} controllerWrapper - Wrapper of the controller, which names its module.
	 * @param {new (...arguments_: Array<unknown>) => unknown} metatype - Controller class.
	 * @param {EApiAuthorizationMode} defaultMode - Controller authorization mode.
	 * @param {string | undefined} resourcePath - IAM resource path of the controller, or undefined when the controller has no IAM resource definition.
	 * @param {string | undefined} policyNamespace - IAM policy namespace of the controller, which names its `list` and `create` actions.
	 * @returns {void}
	 * @throws {Error} When a path part has a wildcard, a path parameter has no PARAMETERS DTO that describes it, the DTO cannot give authorization the text of a path value, a placeholder that is a path parameter is not copied from an entity column, an IAM route that neither lists nor creates lacks a placeholder in its path, a path parameter holds a decimal column, or a handler argument or pipe converts a path value by another rule.
	 */
	private applyRouteParameterRules(controllerWrapper: InstanceWrapper, metatype: new (...arguments_: Array<unknown>) => unknown, defaultMode: EApiAuthorizationMode, resourcePath: string | undefined, policyNamespace: string | undefined): void {
		for (const [methodName, handler] of this.collectMethods(metatype)) {
			const metadata: IApiRouteMetadata<IApiBaseEntity> | undefined = (Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, handler) ?? Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, metatype.prototype as object, methodName)) as IApiRouteMetadata<IApiBaseEntity> | undefined;

			if (!metadata) {
				continue;
			}

			const route: string = `Controller "${metatype.name}" method "${methodName}"`;
			const pathParameters: Array<string> = this.readRouteParameters(controllerWrapper, metatype, handler, route);
			this.parametersRuleRegistry.setPathParameters(metatype, handler, new Set<string>(pathParameters));

			// A generated route carries its own rule, built from the controller entity when the controller is declared.
			const generatedRule: IApiControllerParametersRule | undefined = ApiControllerParametersDtoGet(handler);

			if (generatedRule) {
				ApiControllerParametersAssertComparableColumns(generatedRule, route);
				this.assertGeneratedRuleDescribes(generatedRule, pathParameters, route);
			}

			const runtimeProperties: IApiRouteRuntimeProperties<IApiBaseEntity> | undefined = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_RUNTIME_PROPERTIES_METADATA_KEY, handler) as IApiRouteRuntimeProperties<IApiBaseEntity> | undefined;
			const dto: unknown = Reflect.get(runtimeProperties?.dto ?? {}, EApiDtoType.PARAMETERS);
			const routeDto: (new (...arguments_: Array<unknown>) => unknown) | undefined = generatedRule?.dto ?? (this.isDtoClass(dto) ? dto : undefined);

			if (pathParameters.length > 0) {
				ApiControllerParametersAssertHandlerArguments(metatype, methodName, handler, routeDto, route);
				this.queueValidationPipeProbes(controllerWrapper, metatype, handler, route);
			}

			const mode: EApiAuthorizationMode = metadata.security?.authorization?.mode ?? defaultMode;

			if (mode === EApiAuthorizationMode.IAM && resourcePath !== undefined) {
				// The guard also gives IAM the value of a generated GET identity parameter under the entity field it names.
				const identityPlan: IApiControllerIdentityPlan | undefined = ApiControllerIdentityPlanGet(handler);
				const authorizedParameters: Array<string> = identityPlan && pathParameters.includes(identityPlan.parameter) ? [...pathParameters, identityPlan.field] : pathParameters;

				ApiControllerParametersAssertResourcePathPlaceholders({ action: `${policyNamespace ?? ""}:${metadata.resource.action}`, pathParameters: authorizedParameters, policyNamespace, resourcePath, route, routeType: metadata.route.type });
			}

			// A generated route carries its own rule; every other route gets the rule the guard would build without startup.
			const rule: IApiControllerParametersRule | undefined = generatedRule ? undefined : ApiControllerParametersBuildRouteRule({ controller: metatype, handler, metadata, methodName, pathParameters });

			if (rule) {
				this.parametersRuleRegistry.set(metatype, handler, rule);
			}
		}
	}

	/**
	 * Rejects a path parameter that the generated PARAMETERS DTO of a route does not hold, such as one a `RouterModule` path or the global prefix adds: the generated rule would pass its text as sent.
	 * @param {IApiControllerParametersRule} rule - Generated path value rule of the route.
	 * @param {ReadonlyArray<string>} pathParameters - Path parameters of the whole route path.
	 * @param {string} route - Controller and method, for the error message.
	 * @returns {void}
	 * @throws {Error} When a path parameter has no property in the generated PARAMETERS DTO.
	 */
	private assertGeneratedRuleDescribes(rule: IApiControllerParametersRule, pathParameters: ReadonlyArray<string>, route: string): void {
		const described: Set<string> = new Set<string>(
			getMetadataStorage()
				.getTargetValidationMetadatas(rule.dto, "", false, false)
				.map(({ propertyName }: { propertyName: string }): string => propertyName),
		);

		for (const parameter of pathParameters) {
			if (!described.has(parameter)) {
				throw ErrorException(`${route} has the path parameter "${parameter}", which its generated PARAMETERS DTO does not describe, so a policy and the service would read the text as sent: serve the route with @ApiRouteCustom and a PARAMETERS DTO that describes it`);
			}
		}
	}

	/**
	 * Fails startup when a securable controller serves a handler that skips authorization.
	 * A microservice or WebSocket transport has no identity that authorization can trust, because the caller writes the payload that the guard would read as the request, so a handler on such a transport is refused whatever its decorators.
	 * Nest takes the route and the pattern from the prototype and the guards from the function on the instance, so both are checked. An instance of a request-scoped controller does not exist yet, so its replaced handler is left to `ApiAuthorizationHandlerGuard`.
	 * @param {InstanceWrapper} controllerWrapper - Wrapper of the controller.
	 * @param {new (...arguments_: Array<unknown>) => unknown} metatype - Controller class that Nest registered.
	 * @param {string} methodName - Name of the handler.
	 * @param {object} handler - The function on the prototype under that name.
	 * @returns {void}
	 */
	private assertServedHandlerAuthorized(controllerWrapper: InstanceWrapper, metatype: new (...arguments_: Array<unknown>) => unknown, methodName: string, handler: object): void {
		const pattern: string | undefined = this.formatHandledPattern(handler);

		if (pattern !== undefined) {
			const message: string = `Controller "${metatype.name}" method "${methodName}" handles pattern ${pattern}, and that transport has no identity that authorization can trust: move it to a controller that is not securable`;

			authorizationBootstrapValidationLogger.error(message);

			throw ErrorException(message);
		}

		const route: string | undefined = this.formatServedRoute(controllerWrapper, metatype, handler);

		if (route === undefined) {
			return;
		}

		if (!AuthorizationIsHandlerAuthorized(metatype, handler)) {
			const message: string = `Controller "${metatype.name}" method "${methodName}" serves ${route} without authorization: declare it with @ApiRouteCustom or @ApiMethod, or move it to a controller that is not securable. Route metadata written by hand also needs ApiAuthorizationGuard or a subclass of it in @UseGuards on the method or the controller; a guard instance and APP_GUARD do not count`;

			authorizationBootstrapValidationLogger.error(message);

			throw ErrorException(message);
		}

		const instance: Record<string, unknown> | undefined = controllerWrapper.instance as Record<string, unknown> | undefined;
		const servedHandler: unknown = instance ? instance[methodName] : handler;

		if (servedHandler !== handler && !AuthorizationIsHandlerAuthorized(metatype, servedHandler)) {
			const message: string = `Controller "${metatype.name}" method "${methodName}" serves ${route} through a function set on the controller instance, and Nest takes guards from that function, so the handler skips authorization: remove the assignment, for example this.${methodName} = this.${methodName}.bind(this) in the constructor. Nest already calls a handler with this set to the controller`;

			authorizationBootstrapValidationLogger.error(message);

			throw ErrorException(message);
		}
	}

	private assertValidMode(mode: unknown, controllerName: string, routeName?: string): asserts mode is EApiAuthorizationMode {
		if (mode === EApiAuthorizationMode.HOOKS || mode === EApiAuthorizationMode.IAM) {
			return;
		}

		if (routeName) {
			authorizationBootstrapValidationLogger.error(`Controller "${controllerName}" route "${routeName}" uses unknown authorization mode "${String(mode)}"`);

			throw ErrorException(`Controller "${controllerName}" route "${routeName}" uses unknown authorization mode "${String(mode)}"`);
		}

		authorizationBootstrapValidationLogger.error(`Controller "${controllerName}" uses unknown authorization mode "${String(mode)}"`);

		throw ErrorException(`Controller "${controllerName}" uses unknown authorization mode "${String(mode)}"`);
	}

	/**
	 * Lists the methods of a controller class, own and inherited, so a route declared on a base class is checked for each controller that serves it.
	 * Each name is read from its property descriptor, nearest class first, so an override hides the base method and an accessor is skipped without running it.
	 * @param {{ prototype: object }} metatype - Controller class.
	 * @param {object} metatype.prototype - Prototype of the controller class.
	 * @returns {Map<string, object>} Handler functions by method name, without `constructor`.
	 */
	private collectMethods(metatype: { prototype: object }): Map<string, object> {
		const methods: Map<string, object> = new Map<string, object>();
		const seenNames: Set<string> = new Set<string>();

		for (let prototype: null | object = metatype.prototype; prototype && prototype !== Object.prototype; prototype = Reflect.getPrototypeOf(prototype)) {
			for (const name of Object.getOwnPropertyNames(prototype)) {
				if (name === "constructor" || seenNames.has(name)) {
					continue;
				}

				seenNames.add(name);
				const value: unknown = Object.getOwnPropertyDescriptor(prototype, name)?.value;

				if (typeof value === "function") {
					methods.set(name, value);
				}
			}
		}

		return methods;
	}

	/**
	 * Records that startup checked every route, so the guard compares each request with what was recorded.
	 * @returns {void}
	 */
	private finishStartupChecks(): void {
		this.parametersRuleRegistry.markStartupChecked();

		authorizationBootstrapValidationLogger.verbose("Authorization bootstrap validation finished.");
	}

	/**
	 * Formats the patterns of a `@MessagePattern`, `@EventPattern` or `@SubscribeMessage` handler for an error message.
	 * @param {object} handler - The function on the prototype.
	 * @returns {string | undefined} The patterns as JSON, or undefined when the handler has none.
	 */
	private formatHandledPattern(handler: object): string | undefined {
		if (Reflect.getMetadata(AUTHORIZATION_GATEWAY_METADATA_CONSTANT.MESSAGE_HANDLER_KEY, handler) !== undefined) {
			return JSON.stringify(Reflect.getMetadata(AUTHORIZATION_GATEWAY_METADATA_CONSTANT.MESSAGE_KEY, handler));
		}

		if (Reflect.getMetadata(AUTHORIZATION_MICROSERVICE_METADATA_CONSTANT.PATTERN_HANDLER_KEY, handler) === undefined) {
			return undefined;
		}

		const patterns: Array<unknown> = (Reflect.getMetadata(AUTHORIZATION_MICROSERVICE_METADATA_CONSTANT.PATTERN_KEY, handler) as Array<unknown> | undefined) ?? [];

		return patterns.map((pattern: unknown): string => JSON.stringify(pattern)).join(", ");
	}

	/**
	 * Formats the HTTP route of a handler for an error message, with the `RouterModule` prefix and the version.
	 * The global prefix and the form of the version belong to the application configuration, which is not available here.
	 * @param {InstanceWrapper} controllerWrapper - Wrapper of the controller.
	 * @param {new (...arguments_: Array<unknown>) => unknown} metatype - Controller class that Nest registered.
	 * @param {object} handler - The function on the prototype.
	 * @returns {string | undefined} The request method and paths, or undefined when the handler is not an HTTP route.
	 */
	private formatServedRoute(controllerWrapper: InstanceWrapper, metatype: new (...arguments_: Array<unknown>) => unknown, handler: object): string | undefined {
		const routePath: unknown = Reflect.getMetadata(PATH_METADATA, handler);

		if (routePath === undefined) {
			return undefined;
		}

		const requestMethod: RequestMethod | undefined = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
		const modulePath: string = this.resolveModulePath(controllerWrapper);
		const controllerPaths: Array<string> = [Reflect.getMetadata(PATH_METADATA, metatype) as unknown].flat() as Array<string>;
		const routePaths: Array<string> = [routePath].flat() as Array<string>;
		const paths: Array<string> = controllerPaths.flatMap((controllerPath: string): Array<string> => routePaths.map((path: string): string => `/${modulePath}/${controllerPath}/${path}`.replaceAll(/\/+/gu, "/").replace(/(?<=.)\/$/u, "")));
		const versions: Array<unknown> = [(Reflect.getMetadata(VERSION_METADATA, handler) as unknown) ?? (Reflect.getMetadata(VERSION_METADATA, metatype) as unknown) ?? []].flat();
		const formattedMethod: string = requestMethod === undefined ? "" : `${RequestMethod[requestMethod]} `;
		const formattedVersion: string = versions.length === 0 ? "" : ` (version ${versions.map((version: unknown): string => (typeof version === "symbol" ? "neutral" : String(version))).join(", ")})`;

		return `${formattedMethod}${paths.join(", ")}${formattedVersion}`;
	}

	/**
	 * Tells whether a configured DTO is a class.
	 * @param {unknown} value - Configured DTO.
	 * @returns {boolean} Whether it is a class.
	 */
	private isDtoClass(value: unknown): value is Type<unknown> {
		return typeof value === "function";
	}

	/**
	 * Queues the check of each `ValidationPipe` in `@UsePipes` of a route with a path parameter. Nest creates the class form once per module, so its instance is taken from the module of the controller.
	 * @param {InstanceWrapper} controllerWrapper - Wrapper of the controller.
	 * @param {new (...arguments_: Array<unknown>) => unknown} metatype - Controller class.
	 * @param {object} handler - Handler function.
	 * @param {string} route - Controller and method, for the error message.
	 * @returns {void}
	 */
	private queueValidationPipeProbes(controllerWrapper: InstanceWrapper, metatype: new (...arguments_: Array<unknown>) => unknown, handler: object, route: string): void {
		for (const { pipe, place } of ApiControllerParametersReadValidationPipes(metatype, handler)) {
			const instance: unknown = pipe instanceof ValidationPipe ? pipe : controllerWrapper.host?.injectables.get(ValidationPipe)?.instance;

			if (instance instanceof ValidationPipe) {
				this.pipeProbes.push(async (): Promise<void> => ApiControllerParametersAssertValidationPipePackages(instance, route, place));
			}
		}
	}

	/**
	 * Lists the path parameters of the paths Nest serves a handler at: the global prefix, unless `setGlobalPrefix` excludes the route, the `RouterModule` path, the controller path, and the route path, read as the router of the running HTTP adapter reads them.
	 * A handler served at several paths gets the parameters of all of them, because each request carries the parameters of one.
	 * @param {InstanceWrapper} controllerWrapper - Wrapper of the controller, whose module holds the `RouterModule` path.
	 * @param {new (...arguments_: Array<unknown>) => unknown} metatype - Controller class.
	 * @param {object} handler - Handler function.
	 * @param {string} route - Controller and method, for the error message.
	 * @returns {Array<string>} Parameter names, each once.
	 * @throws {Error} When a part of a served path has a wildcard.
	 */
	private readRouteParameters(controllerWrapper: InstanceWrapper, metatype: new (...arguments_: Array<unknown>) => unknown, handler: object, route: string): Array<string> {
		const modulePath: string = this.resolveModulePath(controllerWrapper);
		const requestMethod: RequestMethod | undefined = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
		const globalPrefix: string = this.applicationConfig?.getGlobalPrefix() ?? "";
		const excludedRoutes: ReadonlyArray<{ pathRegex: RegExp; requestMethod: RequestMethod }> = this.applicationConfig?.getGlobalPrefixOptions().exclude ?? [];
		const controllerPaths: Array<unknown> = [Reflect.getMetadata(PATH_METADATA, metatype) as unknown].flat();
		const routePaths: Array<unknown> = [Reflect.getMetadata(PATH_METADATA, handler) as unknown].flat();
		// The path is read with the grammar of the router that serves it; without a known adapter, with both.
		const adapterType: string | undefined = this.httpAdapterHost?.httpAdapter?.getType();
		const parameters: Set<string> = new Set<string>();

		for (const controllerPath of controllerPaths) {
			for (const routePath of routePaths) {
				// Nest joins the parts this way and matches the exclusions of the global prefix against the result, see RoutePathFactory.
				let path: string = "";

				for (const part of [modulePath, controllerPath, routePath]) {
					if (typeof part === "string" && part.length > 0) {
						path = stripEndSlash(path) + addLeadingSlash(part);
					}
				}

				const isExcluded: boolean =
					requestMethod !== undefined &&
					excludedRoutes.some(
						(excluded: { pathRegex: RegExp; requestMethod: RequestMethod }): boolean =>
							// Nest reads both RequestMethod.ALL and -1 as every method, see isRouteExcluded.
							[-1, requestMethod, RequestMethod.ALL].includes(excluded.requestMethod) && excluded.pathRegex.exec(addLeadingSlash(path)) !== null,
					);

				for (const parameter of ApiControllerParametersReadPath([isExcluded ? "" : globalPrefix, modulePath, controllerPath, routePath], route, adapterType)) {
					parameters.add(parameter);
				}
			}
		}

		return [...parameters];
	}

	/**
	 * Registers the DataSource an IAM controller reads its entity from, so its query scopes lower to that database's
	 * dialect: the DataSource of the controller service's repository, or else every DataSource provider of the
	 * application that maps the entity. An entity no DataSource maps lowers with the portable dialect.
	 * @param {InstanceWrapper} controllerWrapper - Controller wrapper.
	 * @param {object} entity - Resource entity class.
	 */
	private registerIamDialect(controllerWrapper: InstanceWrapper, entity: object): void {
		if (!this.iamDialectRegistry) {
			return;
		}

		const instance: unknown = controllerWrapper.instance;
		const service: unknown = instance && typeof instance === "object" ? Reflect.get(instance, "service") : undefined;
		const repository: unknown = service && typeof service === "object" ? Reflect.get(service, "repository") : undefined;

		if (DatabaseTypeOrmIsRepository(repository)) {
			this.iamDialectRegistry.register(entity, repository.manager.dataSource);

			return;
		}

		for (const moduleReference of this.modulesContainer.values()) {
			for (const provider of moduleReference.providers.values()) {
				const value: unknown = provider.isDependencyTreeStatic() ? provider.instance : undefined;

				if (InstanceChecker.isDataSource(value) && value.hasMetadata(entity as new () => unknown)) {
					this.iamDialectRegistry.register(entity, value);
				}
			}
		}
	}

	/**
	 * Resolves the `RouterModule` prefix of the module that holds a controller, the way Nest does.
	 * @param {InstanceWrapper} controllerWrapper - Wrapper of the controller.
	 * @returns {string} The prefix, or an empty string without one.
	 */
	private resolveModulePath(controllerWrapper: InstanceWrapper): string {
		const moduleMetatype: object | undefined = controllerWrapper.host?.metatype;

		if (!moduleMetatype) {
			return "";
		}

		return (Reflect.getMetadata(`${MODULE_PATH}${this.modulesContainer.applicationId}`, moduleMetatype) as string | undefined) ?? (Reflect.getMetadata(MODULE_PATH, moduleMetatype) as string | undefined) ?? "";
	}

	private validateController(controllerWrapper: InstanceWrapper): void {
		const metatype: (new (...arguments_: Array<unknown>) => unknown) | null = controllerWrapper.metatype as (new (...arguments_: Array<unknown>) => unknown) | null;

		if (!metatype) {
			return;
		}

		authorizationBootstrapValidationLogger.verbose(`Validating authorization configuration for controller "${metatype.name}".`);

		const isSecurable: boolean = Boolean(Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, metatype));
		const properties: IApiControllerProperties<IApiBaseEntity> | undefined = Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY, metatype) as IApiControllerProperties<IApiBaseEntity> | undefined;
		const authorization: IApiControllerProperties<IApiBaseEntity>["authorization"] | undefined = properties?.authorization;

		if (isSecurable && !authorization) {
			authorizationBootstrapValidationLogger.error(`Controller "${metatype.name}" is marked with @ApiControllerSecurable() but does not declare an authorization block`);

			throw ErrorException(`Controller "${metatype.name}" is marked with @ApiControllerSecurable() but does not declare an authorization block`);
		}

		if (!isSecurable && authorization) {
			authorizationBootstrapValidationLogger.error(`Controller "${metatype.name}" declares an authorization block but is missing @ApiControllerSecurable()`);

			throw ErrorException(`Controller "${metatype.name}" declares an authorization block but is missing @ApiControllerSecurable()`);
		}

		if (!authorization || !properties) {
			return;
		}

		this.assertValidMode(authorization.defaultMode, metatype.name);

		const enabledRouteTypes: Array<EApiRouteType> = Object.values(EApiRouteType).filter((routeType: EApiRouteType) => properties.routes[routeType]?.generation?.isEnabled !== false);
		const enabledRouteModes: Set<EApiAuthorizationMode> = new Set<EApiAuthorizationMode>(enabledRouteTypes.map((routeType: EApiRouteType) => properties.routes[routeType]?.security?.authorization?.mode ?? authorization.defaultMode));
		const methodRouteModes: Set<EApiAuthorizationMode> = this.validateControllerRoutes(controllerWrapper, metatype, properties);

		for (const routeMode of methodRouteModes) {
			enabledRouteModes.add(routeMode);
		}

		const usesHooks: boolean = enabledRouteModes.has(EApiAuthorizationMode.HOOKS);
		const usesIam: boolean = enabledRouteModes.has(EApiAuthorizationMode.IAM);

		for (const routeType of enabledRouteTypes) {
			const routeMode: EApiAuthorizationMode = properties.routes[routeType]?.security?.authorization?.mode ?? authorization.defaultMode;
			this.assertValidMode(routeMode, metatype.name, routeType);
		}

		if (usesHooks && !this.policyRegistry.hasSubscriberForEntity(properties.entity as unknown as new () => IApiBaseEntity)) {
			authorizationBootstrapValidationLogger.error(`Controller "${metatype.name}" uses hooks authorization but no @ApiAuthorizationPolicy(...) is registered for entity "${properties.entity.name ?? "UnknownEntity"}"`);

			throw ErrorException(`Controller "${metatype.name}" uses hooks authorization but no @ApiAuthorizationPolicy(...) is registered for entity "${properties.entity.name ?? "UnknownEntity"}"`);
		}

		if (usesIam) {
			if (!authorization.policyNamespace) {
				authorizationBootstrapValidationLogger.error(`Controller "${metatype.name}" uses IAM authorization but does not declare policyNamespace`);

				throw ErrorException(`Controller "${metatype.name}" uses IAM authorization but does not declare policyNamespace`);
			}

			if (!authorization.resourceDefinition) {
				authorizationBootstrapValidationLogger.error(`Controller "${metatype.name}" uses IAM authorization but does not declare resourceDefinition`);

				throw ErrorException(`Controller "${metatype.name}" uses IAM authorization but does not declare resourceDefinition`);
			}

			if (this.documentSources.length === 0) {
				authorizationBootstrapValidationLogger.error(`Controller "${metatype.name}" uses IAM authorization but no documentSources are registered`);

				throw ErrorException(`Controller "${metatype.name}" uses IAM authorization but no documentSources are registered`);
			}

			if (authorization.resourceDefinition.namespace !== authorization.policyNamespace) {
				authorizationBootstrapValidationLogger.error(`Controller "${metatype.name}" resourceDefinition namespace must match policyNamespace`);

				throw ErrorException(`Controller "${metatype.name}" resourceDefinition namespace must match policyNamespace`);
			}

			if (authorization.resourceDefinition.entity !== properties.entity) {
				authorizationBootstrapValidationLogger.error(`Controller "${metatype.name}" resourceDefinition entity must match controller entity`);

				throw ErrorException(`Controller "${metatype.name}" resourceDefinition entity must match controller entity`);
			}

			this.validateResourceDefinition(metatype.name, authorization.resourceDefinition);
			// Policy document validation checks `resource.*` keys against the fields each namespace maps.
			ApiAuthorizationIamResourceDefinitionRegistry.getInstance().register(authorization.resourceDefinition);
			this.registerIamDialect(controllerWrapper, authorization.resourceDefinition.entity);
		}

		this.applyRouteParameterRules(controllerWrapper, metatype, authorization.defaultMode, authorization.resourceDefinition?.resourcePath, authorization.policyNamespace);
	}

	/**
	 * Validates every handler a controller serves, walking its methods the way Nest does, because `@ApiController` returns a wrapper class whose prototype holds no route.
	 * The closest definition of a method name is the one Nest serves, so it hides the definitions further up, also when it has no route metadata. Accessors do not run.
	 * @param {InstanceWrapper} controllerWrapper - Wrapper of the controller.
	 * @param {new (...arguments_: Array<unknown>) => unknown} metatype - Controller class that Nest registered.
	 * @param {IApiControllerProperties<IApiBaseEntity>} properties - Controller properties.
	 * @returns {Set<EApiAuthorizationMode>} Authorization modes of the routes with route metadata.
	 */
	private validateControllerRoutes(controllerWrapper: InstanceWrapper, metatype: new (...arguments_: Array<unknown>) => unknown, properties: IApiControllerProperties<IApiBaseEntity>): Set<EApiAuthorizationMode> {
		const modes: Set<EApiAuthorizationMode> = new Set<EApiAuthorizationMode>();
		const prototype: Record<string, unknown> = metatype.prototype as Record<string, unknown>;

		for (const methodName of this.metadataScanner.getAllMethodNames(prototype)) {
			const handler: object = prototype[methodName] as object;

			this.assertServedHandlerAuthorized(controllerWrapper, metatype, methodName, handler);

			const metadata: IApiRouteMetadata<IApiBaseEntity> | undefined = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, handler) as IApiRouteMetadata<IApiBaseEntity> | undefined;

			if (!metadata) {
				continue;
			}

			if (!metadata.resource?.action || typeof metadata.resource.action !== "string") {
				throw ErrorException(`Controller "${metatype.name}" method "${methodName}" must declare route resource.action`);
			}

			if (metadata.resource.entity !== properties.entity) {
				throw ErrorException(`Controller "${metatype.name}" method "${methodName}" route resource.entity must match controller entity`);
			}

			if (!(metadata as Partial<IApiRouteMetadata<IApiBaseEntity>>).route) {
				throw ErrorException(`Controller "${metatype.name}" method "${methodName}" route metadata must declare route`);
			}

			const mode: unknown = metadata.security?.authorization?.mode ?? properties.authorization?.defaultMode;

			this.assertValidMode(mode, metatype.name, methodName);
			modes.add(mode);
		}

		return modes;
	}

	private validateResourceDefinition(controllerName: string, resourceDefinition: NonNullable<IApiControllerProperties<IApiBaseEntity>["authorization"]>["resourceDefinition"]): void {
		if (!resourceDefinition) {
			return;
		}

		if (typeof resourceDefinition.namespace !== "string" || resourceDefinition.namespace.length === 0) {
			authorizationBootstrapValidationLogger.error(`Controller "${controllerName}" resourceDefinition.namespace must be a non-empty string`);

			throw ErrorException(`Controller "${controllerName}" resourceDefinition.namespace must be a non-empty string`);
		}

		if (typeof resourceDefinition.resourceType !== "string" || resourceDefinition.resourceType.length === 0) {
			authorizationBootstrapValidationLogger.error(`Controller "${controllerName}" resourceDefinition.resourceType must be a non-empty string`);

			throw ErrorException(`Controller "${controllerName}" resourceDefinition.resourceType must be a non-empty string`);
		}

		if (typeof resourceDefinition.resourcePath !== "string" || resourceDefinition.resourcePath.length === 0) {
			authorizationBootstrapValidationLogger.error(`Controller "${controllerName}" resourceDefinition.resourcePath must be a non-empty string`);

			throw ErrorException(`Controller "${controllerName}" resourceDefinition.resourcePath must be a non-empty string`);
		}

		const fieldPaths: Set<string> = new Set<string>();
		const queryPaths: Set<string> = new Set<string>();

		for (const field of resourceDefinition.fields) {
			if (!field.path.startsWith("resource.")) {
				authorizationBootstrapValidationLogger.error(`Controller "${controllerName}" resource field path "${field.path}" must start with "resource."`);

				throw ErrorException(`Controller "${controllerName}" resource field path "${field.path}" must start with "resource."`);
			}

			if (field.path.length === 0 || field.queryPath.length === 0) {
				authorizationBootstrapValidationLogger.error(`Controller "${controllerName}" resource field mappings must use non-empty path and queryPath`);

				throw ErrorException(`Controller "${controllerName}" resource field mappings must use non-empty path and queryPath`);
			}

			if (fieldPaths.has(field.path)) {
				authorizationBootstrapValidationLogger.error(`Controller "${controllerName}" resourceDefinition contains duplicate field path "${field.path}"`);

				throw ErrorException(`Controller "${controllerName}" resourceDefinition contains duplicate field path "${field.path}"`);
			}

			if (queryPaths.has(field.queryPath)) {
				authorizationBootstrapValidationLogger.error(`Controller "${controllerName}" resourceDefinition contains duplicate queryPath "${field.queryPath}"`);

				throw ErrorException(`Controller "${controllerName}" resourceDefinition contains duplicate queryPath "${field.queryPath}"`);
			}

			// A list of related rows has no single value: SQL would compare each joined row and the evaluator reads the list as missing.
			const queryField: IApiAuthorizationIamQueryField = AuthorizationIamReadQueryField(resourceDefinition.entity, field.queryPath);

			if (queryField.collectionPath !== undefined) {
				authorizationBootstrapValidationLogger.error(`Controller "${controllerName}" resource field "${field.path}" queryPath "${field.queryPath}" crosses the to-many relation "${queryField.collectionPath}"; map a column of the resource or of a to-one relation`);

				throw ErrorException(`Controller "${controllerName}" resource field "${field.path}" queryPath "${field.queryPath}" crosses the to-many relation "${queryField.collectionPath}"; map a column of the resource or of a to-one relation`);
			}

			fieldPaths.add(field.path);
			queryPaths.add(field.queryPath);
		}
	}
}
