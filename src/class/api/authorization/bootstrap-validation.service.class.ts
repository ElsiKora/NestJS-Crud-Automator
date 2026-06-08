import type { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";

import { AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN } from "@constant/class/authorization";
import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { EApiAuthorizationMode } from "@enum/class/authorization";
import { EApiRouteType } from "@enum/decorator/api/route";
import { IApiBaseEntity } from "@interface/api-base-entity.interface";
import { IApiControllerProperties, IApiRouteMetadata } from "@interface/decorator/api";
import { Inject, Injectable, OnApplicationBootstrap, Optional } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";

import { ApiAuthorizationPolicyRegistry } from "./policy/registry.class";

const authorizationBootstrapValidationLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationBootstrapValidationService");

@Injectable()
export class ApiAuthorizationBootstrapValidationService implements OnApplicationBootstrap {
	public constructor(
		private readonly discoveryService: DiscoveryService,
		private readonly policyRegistry: ApiAuthorizationPolicyRegistry,
		@Inject(AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN)
		@Optional()
		private readonly documentSources: ReadonlyArray<unknown> = [],
	) {}

	public onApplicationBootstrap(): void {
		const controllerWrappers: Array<InstanceWrapper> = this.discoveryService.getControllers();

		authorizationBootstrapValidationLogger.verbose(`Starting authorization bootstrap validation for ${controllerWrappers.length} controllers.`);

		for (const controllerWrapper of controllerWrappers) {
			this.validateController(controllerWrapper);
		}

		authorizationBootstrapValidationLogger.verbose("Authorization bootstrap validation finished.");
	}

	private assertValidMode(mode: unknown, controllerName: string, routeType?: EApiRouteType): asserts mode is EApiAuthorizationMode {
		if (mode === EApiAuthorizationMode.HOOKS || mode === EApiAuthorizationMode.IAM) {
			return;
		}

		if (routeType) {
			authorizationBootstrapValidationLogger.error(`Controller "${controllerName}" route "${routeType}" uses unknown authorization mode "${String(mode)}"`);

			throw ErrorException(`Controller "${controllerName}" route "${routeType}" uses unknown authorization mode "${String(mode)}"`);
		}

		authorizationBootstrapValidationLogger.error(`Controller "${controllerName}" uses unknown authorization mode "${String(mode)}"`);

		throw ErrorException(`Controller "${controllerName}" uses unknown authorization mode "${String(mode)}"`);
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
		const methodRouteModes: Set<EApiAuthorizationMode> = this.validateMethodLevelRouteMetadata(metatype, properties);

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

	private validateMethodLevelRouteMetadata(metatype: new (...arguments_: Array<unknown>) => unknown, properties: IApiControllerProperties<IApiBaseEntity>): Set<EApiAuthorizationMode> {
		const modes: Set<EApiAuthorizationMode> = new Set<EApiAuthorizationMode>();

		for (const methodName of Object.getOwnPropertyNames(metatype.prototype)) {
			if (methodName === "constructor") {
				continue;
			}

			const handler: unknown = (metatype.prototype as Record<string, unknown>)[methodName];
			const handlerMetadata: unknown = typeof handler === "function" ? Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, handler) : undefined;
			const prototypeMetadata: unknown = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, metatype.prototype as object, methodName);
			const metadata: IApiRouteMetadata<IApiBaseEntity> | undefined = (handlerMetadata ?? prototypeMetadata) as IApiRouteMetadata<IApiBaseEntity> | undefined;

			if (!metadata) {
				continue;
			}

			if (!metadata.resource?.action || typeof metadata.resource.action !== "string") {
				throw ErrorException(`Controller "${metatype.name}" method "${methodName}" must declare route resource.action`);
			}

			if (metadata.resource.entity !== properties.entity) {
				throw ErrorException(`Controller "${metatype.name}" method "${methodName}" route resource.entity must match controller entity`);
			}

			const mode: unknown = metadata.security?.authorization?.mode;

			if (!mode) {
				throw ErrorException(`Controller "${metatype.name}" method "${methodName}" must declare method-level authorization mode`);
			}

			this.assertValidMode(mode, metatype.name);
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
