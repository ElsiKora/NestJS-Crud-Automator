import type { IApiAuthorizationModuleOptions } from "@interface/class/api/authorization";
import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";
import type { IApiRouteRuntimeProperties } from "@interface/decorator/api";
import type { Type } from "@nestjs/common";
import type { InstanceWrapper } from "@nestjs/core/internal";

import { ApiAuthorizationHookPermissionCache } from "@class/api/authorization/hook";
import { ApiAuthorizationIamAttachmentCache, ApiAuthorizationIamDocumentCache } from "@class/api/authorization/iam";
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
import { Inject, Injectable, OnApplicationBootstrap, Optional, RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, MODULE_PATH, PATH_METADATA, VERSION_METADATA } from "@nestjs/common/internal";
import { DiscoveryService, MetadataScanner, ModulesContainer } from "@nestjs/core";
import { ApiControllerParametersAssertComparableColumns, ApiControllerParametersBuildCustomRule } from "@utility/api/controller/parameters/custom-rule.utility";
import { ApiControllerParametersDtoGet } from "@utility/api/controller/parameters/dto";
import { ApiControllerParametersAssertHandlerArguments } from "@utility/api/controller/parameters/handler-arguments.utility";
import { AuthorizationIsHandlerAuthorized } from "@utility/authorization/is-handler-authorized.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";

const authorizationBootstrapValidationLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationBootstrapValidationService");

@Injectable()
export class ApiAuthorizationBootstrapValidationService implements OnApplicationBootstrap {
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
	) {
		// A manual `new` without the registry, from JavaScript or through a cast, fails here instead of on the first start.
		if (!(parametersRuleRegistry instanceof ApiAuthorizationParametersRuleRegistry)) {
			throw ErrorException("ApiAuthorizationBootstrapValidationService needs ApiAuthorizationParametersRuleRegistry: resolve it from ApiAuthorizationModule or pass the registry to the constructor");
		}
	}

	public onApplicationBootstrap(): void {
		this.hookPermissionCache.configure(this.moduleOptions.cache);
		this.iamAttachmentCache.configure(this.moduleOptions.cache);
		this.iamDocumentCache.configure(this.moduleOptions.cache);
		this.parametersRuleRegistry.clear();
		const controllerWrappers: Array<InstanceWrapper> = this.discoveryService.getControllers();

		authorizationBootstrapValidationLogger.verbose(`Starting authorization bootstrap validation for ${controllerWrappers.length} controllers.`);

		for (const controllerWrapper of controllerWrappers) {
			this.validateController(controllerWrapper);
		}

		authorizationBootstrapValidationLogger.verbose("Authorization bootstrap validation finished.");
	}

	/**
	 * Registers the path value rule of each securable custom route with a path parameter, IAM or HOOKS, so the guard runs its PARAMETERS DTO and the policy and the handler see the canonical text of the values it produces. A generated route already has its rule, and only its columns are checked here.
	 * The rule is built and kept for this controller class: a handler inherited from a base class is shared with its other subclasses, whose resource paths may differ.
	 * A HOOKS policy compares `context.parameters` as text as an IAM Deny does, so both modes need the same rule: a route without a PARAMETERS DTO that describes each path parameter, a path value held in a decimal column, and a handler argument that converts a path value by another rule fail startup.
	 * @param {new (...arguments_: Array<unknown>) => unknown} metatype - Controller class.
	 * @param {EApiAuthorizationMode} defaultMode - Controller authorization mode.
	 * @param {string | undefined} resourcePath - IAM resource path of the controller, or undefined when the controller has no IAM resource definition.
	 * @returns {void}
	 * @throws {Error} When a path parameter has no PARAMETERS DTO that describes it, the DTO cannot give authorization the text of a path value, a placeholder that is a path parameter is not copied from an entity column, a path parameter holds a decimal column, or a handler argument converts a path value by another rule.
	 */
	private applyRouteParameterRules(metatype: new (...arguments_: Array<unknown>) => unknown, defaultMode: EApiAuthorizationMode, resourcePath: string | undefined): void {
		const controllerPathParameters: Array<string> = this.resolvePathParameters(Reflect.getMetadata(PATH_METADATA, metatype));

		for (const [methodName, handler] of this.collectMethods(metatype)) {
			const metadata: IApiRouteMetadata<IApiBaseEntity> | undefined = (Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, handler) ?? Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, metatype.prototype as object, methodName)) as IApiRouteMetadata<IApiBaseEntity> | undefined;

			if (!metadata) {
				continue;
			}

			// A generated route carries its own rule, built from the controller entity when the controller is declared.
			const generatedRule: IApiControllerParametersRule | undefined = ApiControllerParametersDtoGet(handler);

			if (generatedRule) {
				ApiControllerParametersAssertComparableColumns(generatedRule, `Controller "${metatype.name}" method "${methodName}"`);

				continue;
			}

			const runtimeProperties: IApiRouteRuntimeProperties<IApiBaseEntity> | undefined = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_RUNTIME_PROPERTIES_METADATA_KEY, handler) as IApiRouteRuntimeProperties<IApiBaseEntity> | undefined;
			const dtos: object = runtimeProperties?.dto ?? {};
			const dto: unknown = Reflect.get(dtos, EApiDtoType.PARAMETERS);
			const pathParameters: Array<string> = [...controllerPathParameters, ...this.resolvePathParameters(Reflect.getMetadata(PATH_METADATA, handler))];
			const routeDto: (new (...arguments_: Array<unknown>) => unknown) | undefined = this.isDtoClass(dto) ? dto : undefined;

			const rule: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({
				controller: metatype,
				dto: routeDto,
				methodName,
				pathParameters,
				resourcePath: (metadata.security?.authorization?.mode ?? defaultMode) === EApiAuthorizationMode.IAM ? resourcePath : undefined,
			});

			if (pathParameters.length > 0) {
				ApiControllerParametersAssertHandlerArguments(metatype, methodName, routeDto, `Controller "${metatype.name}" method "${methodName}"`);
			}

			if (rule) {
				this.parametersRuleRegistry.set(metatype, handler, rule);
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

	/**
	 * Lists the `:name` parameters of a Nest path.
	 * @param {unknown} path - Nest `path` metadata: a string or a list of strings.
	 * @returns {Array<string>} Parameter names.
	 */
	private resolvePathParameters(path: unknown): Array<string> {
		const paths: Array<unknown> = Array.isArray(path) ? path : [path];

		return paths.flatMap((entry: unknown): Array<string> => (typeof entry === "string" ? [...entry.matchAll(/:(\w+)/g)].map((match: RegExpExecArray): string => match[1] ?? "") : []));
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
		}

		this.applyRouteParameterRules(metatype, authorization.defaultMode, authorization.resourceDefinition?.resourcePath);
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

			fieldPaths.add(field.path);
			queryPaths.add(field.queryPath);
		}
	}
}
