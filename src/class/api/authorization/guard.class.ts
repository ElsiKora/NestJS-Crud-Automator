import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationRequestMetadata } from "@interface/class/api/authorization/request-metadata.interface";
import type { IApiControllerProperties, IApiControllerRouteAuthorizationProperties, IApiMethodAuthorizationProperties } from "@interface/decorator/api";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

import { ApiAuthorizationRuntime } from "@class/api/authorization/runtime.class";
import { AUTHORIZATION_DECISION_METADATA_CONSTANT } from "@constant/class/authorization/metadata-decision.constant";
import { CONTROLLER_API_DECORATOR_CONSTANT, METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiPolicyEffect } from "@enum/class/authorization";
import { EApiRouteType } from "@enum/decorator/api";
import { IApiAuthorizationDecision } from "@interface/class/api/authorization";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { TApiAuthorizationGuardRequest } from "@type/class/api/authorization";
import { TApiControllerGetListQuery } from "@type/decorator/api/controller";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";
import { DeepPartial } from "typeorm";

const authorizationGuardLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationGuard");

@Injectable()
export class ApiAuthorizationGuard implements CanActivate {
	public constructor(private readonly runtime: ApiAuthorizationRuntime) {}

	public async canActivate(context: ExecutionContext): Promise<boolean> {
		if (!this.isControllerSecurable(context)) {
			authorizationGuardLogger.debug("Controller is not marked as @ApiControllerSecurable, skipping authorization");

			return true;
		}

		const properties: IApiControllerProperties<IApiBaseEntity> | undefined = this.resolveControllerProperties(context);

		if (!properties?.authorization) {
			authorizationGuardLogger.error("ApiControllerSecurable requires an authorization block in @ApiController(...)");

			throw ErrorException("ApiControllerSecurable requires an authorization block in @ApiController(...)");
		}

		const entityConstructor: new () => IApiBaseEntity = properties.entity as new () => IApiBaseEntity;
		const authorization: IApiMethodAuthorizationProperties = this.resolveAuthorization(context);
		const action: string = authorization.action;
		const routeType: EApiRouteType | undefined = this.resolveRouteType(context);
		authorizationGuardLogger.verbose(`Evaluating authorization for entity "${entityConstructor.name}" action "${action}"`);

		const request: TApiAuthorizationGuardRequest = context.switchToHttp().getRequest<TApiAuthorizationGuardRequest>();
		const authenticationRequest: IApiAuthenticationRequest = request as unknown as IApiAuthenticationRequest;
		const requestMetadata: IApiAuthorizationRequestMetadata<IApiBaseEntity> = this.resolveRequestMetadata<IApiBaseEntity>(request);
		const routeAuthorization: IApiControllerRouteAuthorizationProperties | undefined = routeType ? properties.routes[routeType]?.authorization : undefined;

		const decision: IApiAuthorizationDecision<IApiBaseEntity, TApiAuthorizationRuleTransformPayload<IApiBaseEntity>> = await this.runtime.evaluate({
			action,
			authenticationRequest,
			authorization: properties.authorization,
			entity: entityConstructor,
			requestMetadata,
			resource: undefined,
			routeAuthorization,
			routeType,
		});

		this.attachDecisionToRequest(request, decision);

		if (decision.effect === EApiPolicyEffect.DENY) {
			authorizationGuardLogger.warn(`Access denied for entity "${entityConstructor.name}" action "${action}" principal "${decision.principal.id}"`);

			throw new ForbiddenException();
		}

		authorizationGuardLogger.verbose(`Access granted for entity "${entityConstructor.name}" action "${action}" principal "${decision.principal.id}"`);

		return true;
	}

	private attachDecisionToRequest<R>(request: TApiAuthorizationGuardRequest, decision: IApiAuthorizationDecision<IApiBaseEntity, R>): void {
		request.authorizationDecision = decision as IApiAuthorizationDecision<IApiBaseEntity, unknown>;
		request[AUTHORIZATION_DECISION_METADATA_CONSTANT.REQUEST_KEY] = decision;
	}

	private isControllerSecurable(context: ExecutionContext): boolean {
		return Boolean(Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, context.getClass()));
	}

	private resolveAuthorization(context: ExecutionContext): IApiMethodAuthorizationProperties {
		const authorization: IApiMethodAuthorizationProperties | undefined = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.AUTHORIZATION_METADATA_KEY, context.getHandler()) as IApiMethodAuthorizationProperties | undefined;

		if (authorization) {
			return authorization;
		}

		const handlerName: string = context.getHandler().name || "unknown";
		authorizationGuardLogger.error(`ApiControllerSecurable handler "${handlerName}" requires an explicit authorization.action declared via @ApiMethod(...)`);

		throw ErrorException(`ApiControllerSecurable handler "${handlerName}" requires an explicit authorization.action declared via @ApiMethod(...)`);
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

	private resolveRequestMetadata<E extends IApiBaseEntity>(request: TApiAuthorizationGuardRequest): IApiAuthorizationRequestMetadata<E> {
		return {
			body: request.body as DeepPartial<E> | undefined,
			headers: this.resolveHeaders(request.headers),
			ip: typeof request.ip === "string" ? request.ip : undefined,
			parameters: request.params as Partial<E> | undefined,
			query: request.query as TApiControllerGetListQuery<E> | undefined,
		};
	}

	private resolveRouteType(context: ExecutionContext): EApiRouteType | undefined {
		return Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_TYPE_METADATA_KEY, context.getHandler()) as EApiRouteType | undefined;
	}
}
