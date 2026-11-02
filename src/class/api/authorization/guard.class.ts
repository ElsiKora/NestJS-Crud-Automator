import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationRequestMetadata } from "@interface/class/api/authorization/request-metadata.interface";
import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";
import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";
import type { IApiControllerProperties, IApiRouteMetadata } from "@interface/decorator/api";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

import { ApiAuthorizationParametersRuleRegistry } from "@class/api/authorization/parameters-rule-registry.class";
import { ApiAuthorizationRuntime } from "@class/api/authorization/runtime.class";
import { AUTHORIZATION_DECISION_METADATA_CONSTANT } from "@constant/class/authorization/metadata-decision.constant";
import { CONTROLLER_API_DECORATOR_CONSTANT, METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiPolicyEffect } from "@enum/class/authorization";
import { IApiAuthorizationDecision } from "@interface/class/api/authorization";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, InternalServerErrorException, Optional } from "@nestjs/common";
import { TApiAuthorizationGuardRequest } from "@type/class/api/authorization";
import { TApiControllerGetListQuery } from "@type/decorator/api/controller";
import { ApiControllerIdentityPlanGet } from "@utility/api/controller/identity";
import { ApiControllerParametersDtoGet, ApiControllerParametersResolveRequest } from "@utility/api/controller/parameters";
import { AuthorizationSerializeParameters } from "@utility/authorization/serialize-value.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";
import { DeepPartial } from "typeorm";

const authorizationGuardLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationGuard");
const MISSING_REGISTRY_MESSAGE: string = "ApiAuthorizationGuard needs ApiAuthorizationParametersRuleRegistry: resolve the guard from ApiAuthorizationModule or pass app.get(ApiAuthorizationParametersRuleRegistry) to its constructor";

@Injectable()
export class ApiAuthorizationGuard implements CanActivate {
	public constructor(
		private readonly runtime: ApiAuthorizationRuntime,
		// Without ApiAuthorizationModule nothing provides the registry; the guard still resolves, so the module check fails startup with its own message.
		@Optional() private readonly parametersRuleRegistry?: ApiAuthorizationParametersRuleRegistry,
	) {
		if (parametersRuleRegistry !== undefined && !(parametersRuleRegistry instanceof ApiAuthorizationParametersRuleRegistry)) {
			throw ErrorException(MISSING_REGISTRY_MESSAGE);
		}
	}

	public async canActivate(context: ExecutionContext): Promise<boolean> {
		if (!this.isControllerSecurable(context)) {
			authorizationGuardLogger.debug("Controller is not marked as @ApiControllerSecurable, skipping authorization");

			return true;
		}

		// A guard built without the registry cannot see the rule of a custom route, so it refuses instead of authorizing on the text as sent.
		if (!this.parametersRuleRegistry) {
			throw ErrorException(MISSING_REGISTRY_MESSAGE);
		}

		const properties: IApiControllerProperties<IApiBaseEntity> | undefined = this.resolveControllerProperties(context);

		if (!properties?.authorization) {
			authorizationGuardLogger.error("ApiControllerSecurable requires an authorization block in @ApiController(...)");

			throw ErrorException("ApiControllerSecurable requires an authorization block in @ApiController(...)");
		}

		const routeMetadata: IApiRouteMetadata<IApiBaseEntity> = this.resolveRouteMetadata(context);
		const entityConstructor: new () => IApiBaseEntity = routeMetadata.resource.entity;
		const action: string = routeMetadata.resource.action;
		authorizationGuardLogger.verbose(`Evaluating authorization for entity "${entityConstructor.name}" action "${action}"`);

		const request: TApiAuthorizationGuardRequest = context.switchToHttp().getRequest<TApiAuthorizationGuardRequest>();
		const authenticationRequest: IApiAuthenticationRequest = request as unknown as IApiAuthenticationRequest;
		const identityPlan: IApiControllerIdentityPlan | undefined = ApiControllerIdentityPlanGet(context.getHandler());

		// Path values are validated before authorization; authorization sees their canonical text, and so does every later reader of request.params.
		// A custom route rule belongs to the controller class, because a handler inherited by several controllers is one shared function.
		this.assertKnownPathParameters(context, request);
		const parametersRule: IApiControllerParametersRule | undefined = this.parametersRuleRegistry.get(context.getClass(), context.getHandler()) ?? ApiControllerParametersDtoGet(context.getHandler());
		const parameters: Partial<IApiBaseEntity> | undefined = await ApiControllerParametersResolveRequest<IApiBaseEntity>(request, parametersRule, request.params as Partial<IApiBaseEntity> | undefined);
		this.rewriteRequestParameters(request, parameters);
		const requestMetadata: IApiAuthorizationRequestMetadata<IApiBaseEntity, EApiControllerGetListQueryPaginationMode> = this.resolveRequestMetadata<IApiBaseEntity, EApiControllerGetListQueryPaginationMode>(request, parameters, identityPlan);

		const decision: IApiAuthorizationDecision<IApiBaseEntity, TApiAuthorizationRuleTransformPayload<IApiBaseEntity>> = await this.runtime.evaluate({
			action,
			authenticationRequest,
			authorization: properties.authorization,
			entity: entityConstructor,
			requestMetadata,
			resource: undefined,
			routeAuthorization: routeMetadata.security?.authorization,
			routeType: routeMetadata.route.type,
		});

		this.attachDecisionToRequest(request, decision);

		if (decision.effect === EApiPolicyEffect.DENY) {
			authorizationGuardLogger.warn(`Access denied for entity "${entityConstructor.name}" action "${action}" principal "${decision.principal.id}"`);

			throw new ForbiddenException();
		}

		authorizationGuardLogger.verbose(`Access granted for entity "${entityConstructor.name}" action "${action}" principal "${decision.principal.id}"`);

		return true;
	}

	/**
	 * Refuses a request whose path carries a parameter that startup did not check for this route, before any policy, handler, or query sees it, so a value no rule converted never reaches authorization.
	 * Startup reads the global prefix, the `RouterModule` path, the controller path, and the route path; a parameter outside them, or a route startup did not check, fails closed. When startup checks were replaced, as a test harness does, nothing is recorded to compare with.
	 * @param {ExecutionContext} context - Execution context of the request.
	 * @param {TApiAuthorizationGuardRequest} request - HTTP request.
	 * @returns {void}
	 * @throws {InternalServerErrorException} When `request.params` holds a parameter startup did not check.
	 */
	private assertKnownPathParameters(context: ExecutionContext, request: TApiAuthorizationGuardRequest): void {
		if (!this.parametersRuleRegistry?.isStartupChecked()) {
			return;
		}

		const requestParameters: unknown = request.params;
		const knownParameters: ReadonlySet<string> | undefined = this.parametersRuleRegistry.getPathParameters(context.getClass(), context.getHandler());
		const unknownParameter: string | undefined = requestParameters && typeof requestParameters === "object" ? Object.keys(requestParameters).find((key: string): boolean => !knownParameters?.has(key)) : undefined;

		if (unknownParameter !== undefined) {
			authorizationGuardLogger.error(`Controller "${context.getClass().name}" method "${context.getHandler().name}" received the path parameter "${unknownParameter}", which startup did not check for this route, so the request is refused before authorization`);

			throw new InternalServerErrorException();
		}
	}

	private attachDecisionToRequest<R>(request: TApiAuthorizationGuardRequest, decision: IApiAuthorizationDecision<IApiBaseEntity, R>): void {
		request.authorizationDecision = decision as IApiAuthorizationDecision<IApiBaseEntity, unknown>;
		request[AUTHORIZATION_DECISION_METADATA_CONSTANT.REQUEST_KEY] = decision;
	}

	private isControllerSecurable(context: ExecutionContext): boolean {
		return Boolean(Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, context.getClass()));
	}

	private resolveControllerProperties(context: ExecutionContext): IApiControllerProperties<IApiBaseEntity> | undefined {
		return Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY, context.getClass()) as IApiControllerProperties<IApiBaseEntity> | undefined;
	}

	private resolveHeaders(headers: TApiAuthorizationGuardRequest["headers"]): Record<string, string> | undefined {
		if (!headers) {
			return undefined;
		}

		const resolvedHeaders: Record<string, string> = {};

		for (const [key, value] of Object.entries(headers)) {
			if (typeof value === "string") {
				resolvedHeaders[key] = value;
			}

			if (Array.isArray(value)) {
				const resolvedHeaderValue: string | undefined = value.find((headerValue: unknown): headerValue is string => typeof headerValue === "string");

				if (resolvedHeaderValue) {
					resolvedHeaders[key] = resolvedHeaderValue;
				}
			}
		}

		return resolvedHeaders;
	}

	private resolveIdentityParameters<E extends IApiBaseEntity>(parameters: Partial<E> | undefined, identityPlan: IApiControllerIdentityPlan): Partial<E> | undefined {
		if (!parameters || typeof parameters !== "object") {
			return undefined;
		}

		const resolvedParameters: Record<PropertyKey, unknown> = {};

		for (const key of Reflect.ownKeys(parameters)) {
			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(parameters, key);

			if (!descriptor?.enumerable || !("value" in descriptor)) {
				continue;
			}

			Object.defineProperty(resolvedParameters, key, {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				configurable: true,
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				enumerable: true,
				value: descriptor.value,
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				writable: true,
			});
		}

		const identityDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(resolvedParameters, identityPlan.parameter);

		if (identityDescriptor && "value" in identityDescriptor) {
			Object.defineProperty(resolvedParameters, identityPlan.field, {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				configurable: true,
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				enumerable: true,
				value: identityDescriptor.value,
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				writable: true,
			});
		}

		return resolvedParameters as Partial<E>;
	}

	private resolveRequestMetadata<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(request: TApiAuthorizationGuardRequest, parameters: Partial<E> | undefined, identityPlan?: IApiControllerIdentityPlan): IApiAuthorizationRequestMetadata<E, M> {
		return {
			body: request.body as DeepPartial<E> | undefined,
			headers: this.resolveHeaders(request.headers),
			ip: typeof request.ip === "string" ? request.ip : undefined,
			parameters: AuthorizationSerializeParameters(identityPlan ? this.resolveIdentityParameters<E>(parameters, identityPlan) : parameters),
			query: request.query as TApiControllerGetListQuery<E, M> | undefined,
		};
	}

	private resolveRouteMetadata(context: ExecutionContext): IApiRouteMetadata<IApiBaseEntity> {
		const metadata: IApiRouteMetadata<IApiBaseEntity> | undefined = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, context.getHandler()) as IApiRouteMetadata<IApiBaseEntity> | undefined;

		if (metadata) {
			return metadata;
		}

		const handlerName: string = context.getHandler().name || "unknown";
		authorizationGuardLogger.error(`ApiControllerSecurable handler "${handlerName}" requires method-level ApiRouteMetadata`);

		throw ErrorException(`ApiControllerSecurable handler "${handlerName}" requires method-level ApiRouteMetadata`);
	}

	/**
	 * Writes the canonical text of each validated path value back to the request, so a handler `@Param()` reads the value authorization saw.
	 * @param {TApiAuthorizationGuardRequest} request - HTTP request.
	 * @param {Partial<IApiBaseEntity> | undefined} parameters - Validated path values.
	 * @returns {void}
	 */
	private rewriteRequestParameters(request: TApiAuthorizationGuardRequest, parameters: Partial<IApiBaseEntity> | undefined): void {
		const requestParameters: unknown = request.params;

		if (!requestParameters || typeof requestParameters !== "object") {
			return;
		}

		for (const [key, text] of Object.entries(AuthorizationSerializeParameters(parameters) ?? {})) {
			if (Object.hasOwn(requestParameters, key)) {
				Reflect.set(requestParameters, key, text);
			}
		}
	}
}
