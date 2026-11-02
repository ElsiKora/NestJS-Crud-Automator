import type { IApiAuthorizationModuleOptions } from "@interface/class/api/authorization";
import type { InstanceWrapper } from "@nestjs/core/internal";

import { ApiAuthorizationGuard } from "@class/api/authorization/guard.class";
import { ApiAuthorizationHookPermissionCache } from "@class/api/authorization/hook";
import { ApiAuthorizationIamAttachmentCache, ApiAuthorizationIamDocumentCache } from "@class/api/authorization/iam";
import { ApiAuthorizationPolicyRegistry } from "@class/api/authorization/policy/registry.class";
import { AUTHORIZATION_MODULE_OPTIONS_TOKEN, AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN } from "@constant/class/authorization";
import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { EApiAuthorizationMode } from "@enum/class/authorization";
import { EApiRouteType } from "@enum/decorator/api/route";
import { IApiBaseEntity } from "@interface/api-base-entity.interface";
import { IApiControllerProperties, IApiRouteMetadata } from "@interface/decorator/api";
import { Inject, Injectable, OnApplicationBootstrap, Optional, RequestMethod } from "@nestjs/common";
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from "@nestjs/common/internal";
import { DiscoveryService, MetadataScanner } from "@nestjs/core";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";

const authorizationBootstrapValidationLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationBootstrapValidationService");

@Injectable()
export class ApiAuthorizationBootstrapValidationService implements OnApplicationBootstrap {
	private readonly metadataScanner: MetadataScanner = new MetadataScanner();

	public constructor(
		private readonly discoveryService: DiscoveryService,
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
	) {}

	public onApplicationBootstrap(): void {
		this.hookPermissionCache.configure(this.moduleOptions.cache);
		this.iamAttachmentCache.configure(this.moduleOptions.cache);
		this.iamDocumentCache.configure(this.moduleOptions.cache);
		const controllerWrappers: Array<InstanceWrapper> = this.discoveryService.getControllers();

		authorizationBootstrapValidationLogger.verbose(`Starting authorization bootstrap validation for ${controllerWrappers.length} controllers.`);

		for (const controllerWrapper of controllerWrappers) {
			this.validateController(controllerWrapper);
		}

		authorizationBootstrapValidationLogger.verbose("Authorization bootstrap validation finished.");
	}

	/**
	 * Fails startup when a securable controller serves a route that skips authorization.
	 * Only the Nest route metadata on the handler makes it a route.
	 * @param {new (...arguments_: Array<unknown>) => unknown} metatype - Controller class that Nest registered.
	 * @param {string} methodName - Name of the handler.
	 * @param {object} handler - The handler Nest serves under that name.
	 * @returns {void}
	 */
	private assertServedRouteAuthorized(metatype: new (...arguments_: Array<unknown>) => unknown, methodName: string, handler: object): void {
		if (Reflect.getMetadata(PATH_METADATA, handler) === undefined || this.isRouteAuthorized(metatype, handler)) {
			return;
		}

		const message: string = `Controller "${metatype.name}" method "${methodName}" serves ${this.formatServedRoute(metatype, handler)} without authorization: declare it with @ApiRouteCustom or @ApiMethod, or move it to a controller that is not securable`;

		authorizationBootstrapValidationLogger.error(message);

		throw ErrorException(message);
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

	private formatServedRoute(metatype: new (...arguments_: Array<unknown>) => unknown, handler: object): string {
		const requestMethod: RequestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod;
		const controllerPaths: Array<string> = [Reflect.getMetadata(PATH_METADATA, metatype) as unknown].flat() as Array<string>;
		const routePaths: Array<string> = [Reflect.getMetadata(PATH_METADATA, handler) as unknown].flat() as Array<string>;
		const paths: Array<string> = controllerPaths.flatMap((controllerPath: string): Array<string> => routePaths.map((routePath: string): string => `/${controllerPath}/${routePath}`.replaceAll(/\/+/gu, "/").replace(/(?<=.)\/$/u, "")));

		return `${RequestMethod[requestMethod]} ${paths.join(", ")}`;
	}

	private isRouteAuthorized(metatype: new (...arguments_: Array<unknown>) => unknown, handler: object): boolean {
		if (Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, handler) === undefined) {
			return false;
		}

		const guards: Array<unknown> = [...((Reflect.getMetadata(GUARDS_METADATA, handler) as Array<unknown> | undefined) ?? []), ...((Reflect.getMetadata(GUARDS_METADATA, metatype) as Array<unknown> | undefined) ?? [])];

		return guards.some((guard: unknown): boolean => guard === ApiAuthorizationGuard || (typeof guard === "function" && guard.prototype instanceof ApiAuthorizationGuard));
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
		const methodRouteModes: Set<EApiAuthorizationMode> = this.validateControllerRoutes(metatype, properties);

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
	}

	/**
	 * Validates every route a controller serves, walking its methods the way Nest does, because `@ApiController` returns a wrapper class whose prototype holds no route.
	 * The closest definition of a method name is the one Nest serves, so it hides the definitions further up, also when it has no route metadata. Accessors do not run.
	 * @param {new (...arguments_: Array<unknown>) => unknown} metatype - Controller class that Nest registered.
	 * @param {IApiControllerProperties<IApiBaseEntity>} properties - Controller properties.
	 * @returns {Set<EApiAuthorizationMode>} Authorization modes of the routes with route metadata.
	 */
	private validateControllerRoutes(metatype: new (...arguments_: Array<unknown>) => unknown, properties: IApiControllerProperties<IApiBaseEntity>): Set<EApiAuthorizationMode> {
		const modes: Set<EApiAuthorizationMode> = new Set<EApiAuthorizationMode>();
		const prototype: Record<string, unknown> = metatype.prototype as Record<string, unknown>;

		for (const methodName of this.metadataScanner.getAllMethodNames(prototype)) {
			const handler: object = prototype[methodName] as object;

			this.assertServedRouteAuthorized(metatype, methodName, handler);

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
