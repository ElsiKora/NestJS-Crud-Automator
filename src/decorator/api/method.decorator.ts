import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiMethodProperties } from "@interface/decorator/api";
import type { IApiRouteSecurityRequirement } from "@interface/decorator/api/route";
import type { CanActivate, Type } from "@nestjs/common";
import type { TSwaggerSecurityRequirementObject } from "@type/swagger";

import { STATUS_CODES } from "node:http";

import { ApiAuthorizationGuard } from "@class/api/authorization/guard.class";
import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiRouteGuardStage, EApiRouteType } from "@enum/decorator/api";
import { RequestBodyShapeInterceptor } from "@interceptor/request-body-shape.interceptor";
import { UuidCanonicalInterceptor } from "@interceptor/uuid-canonical.interceptor";
import { applyDecorators, Delete, Get, HttpCode, HttpStatus, Patch, Post, Put, RequestMethod, SetMetadata, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiConsumes, ApiExtraModels, ApiHeaders, ApiOperation, ApiProduces, ApiResponse, ApiSecurity } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ApiRouteBuildDiscriminatedDtoOpenApiSchema } from "@utility/api/route/discriminator";
import { ApiRouteCollectDtoWithRegisteredChildren } from "@utility/api/route/dto-collect-with-registered-children.utility";
import { DtoGenerateException } from "@utility/dto/generate/exception.utility";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Composes Nest route, Swagger, throttling, authentication, and route metadata decorators.
 * @template E - Entity type represented by the route metadata.
 * @param {IApiMethodProperties<E>} options - Route metadata used to build the composed method decorator.
 * @returns {MethodDecorator} A decorator for a controller method.
 */
export function ApiMethod<E extends IApiBaseEntity>(options: IApiMethodProperties<E>): MethodDecorator {
	const metadata: IApiMethodProperties<E>["metadata"] = options.metadata;
	let operationSummary: string | undefined = metadata.documentation?.summary ?? metadata.resource.action;

	if (!metadata.documentation?.summary && metadata.route.type) {
		switch (metadata.route.type) {
			case EApiRouteType.CREATE: {
				operationSummary = "Create resource";

				break;
			}

			case EApiRouteType.DELETE: {
				operationSummary = "Delete resource";

				break;
			}

			case EApiRouteType.GET: {
				operationSummary = "Get resource";

				break;
			}

			case EApiRouteType.GET_LIST: {
				operationSummary = "Get resource list";

				break;
			}

			case EApiRouteType.PARTIAL_UPDATE: {
				operationSummary = "Partially update resource";

				break;
			}

			case EApiRouteType.UPDATE: {
				operationSummary = "Update resource";

				break;
			}
		}
	}

	const successResponseDecorators: Array<MethodDecorator> = [];

	if (metadata.response && metadata.response.status !== HttpStatus.NO_CONTENT && Array.isArray(metadata.response.type)) {
		if (!metadata.response.discriminator) {
			throw ErrorException("ApiMethod error: response.discriminator is required when response.type is an array");
		}

		const responseDtos: Array<Type<unknown>> = [];
		ApiRouteCollectDtoWithRegisteredChildren(responseDtos, metadata.response.type);

		successResponseDecorators.push(
			ApiExtraModels(...responseDtos),
			ApiResponse({
				description: "Success",
				headers: metadata.response.headers,
				schema: ApiRouteBuildDiscriminatedDtoOpenApiSchema(
					{
						discriminator: metadata.response.discriminator,
						type: metadata.response.type,
					},
					"ApiMethod response",
				),
				status: metadata.response.status,
			}),
		);
	} else {
		const responseType: Type<unknown> | undefined = Array.isArray(metadata.response?.type) ? undefined : metadata.response?.type;

		successResponseDecorators.push(
			ApiResponse({
				description: "Success",
				headers: metadata.response?.headers,
				status: metadata.response?.status,
				type: responseType,
			}),
		);
	}

	const decorators: Array<MethodDecorator> = [
		SetMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, metadata),
		ApiOperation({
			description: metadata.documentation?.description,
			operationId: metadata.documentation?.operationId,
			summary: operationSummary,
		}),
		...successResponseDecorators,
		HttpCode(metadata.response?.status ?? HttpStatus.OK),
	];

	if (metadata.documentation?.request?.headers?.length) {
		decorators.push(ApiHeaders(metadata.documentation.request.headers));
	}

	if (metadata.documentation?.request?.mediaTypes?.length) {
		decorators.push(ApiConsumes(...metadata.documentation.request.mediaTypes));
	}

	if (metadata.documentation?.response?.mediaTypes?.length) {
		decorators.push(ApiProduces(...metadata.documentation.response.mediaTypes));
	}

	for (const response of metadata.documentation?.response?.statuses ?? []) {
		decorators.push(ApiResponse({ ...response }));
	}

	if (metadata.throttling?.default) {
		decorators.push(Throttle({ default: metadata.throttling.default }));
	}

	const errors: NonNullable<IApiMethodProperties<E>["metadata"]["response"]>["errors"] = metadata.response?.errors;
	// Any guard can reject or refuse; `ApiControllerApplyGuardResponses` adds the guards of the class and of `@UseGuards`
	const hasGuard: boolean = metadata.security?.authentication !== undefined || (options.execution?.guards?.length ?? 0) > 0;
	const hasForbidden: boolean = !!errors?.hasForbidden || hasGuard;
	const hasUnauthorized: boolean = !!errors?.hasUnauthorized || hasGuard;
	// A status the route documents itself replaces the default response of that status, since Swagger joins two declarations
	const documentedStatuses: ReadonlySet<unknown> = new Set<unknown>((metadata.documentation?.response?.statuses ?? []).map((response: { status: unknown }): unknown => response.status));

	const errorStatuses: Array<[boolean, HttpStatus]> = [
		[hasUnauthorized, HttpStatus.UNAUTHORIZED],
		[hasForbidden, HttpStatus.FORBIDDEN],
		// A handler or a guard that throws can fail any route
		[true, HttpStatus.INTERNAL_SERVER_ERROR],
		[!!errors?.hasNotFound, HttpStatus.NOT_FOUND],
		// The body parser refuses a malformed, oversized, or unsupported body on any method: Fastify parses one on DELETE, PATCH, POST, and PUT, Express on GET too
		[true, HttpStatus.BAD_REQUEST],
		[!!errors?.hasConflict, HttpStatus.CONFLICT],
		[true, HttpStatus.PAYLOAD_TOO_LARGE],
		[true, HttpStatus.UNSUPPORTED_MEDIA_TYPE],
		// The ThrottlerGuard answers 429 once it counts the route over its limit
		[!!errors?.hasTooManyRequests || metadata.throttling?.default !== undefined, HttpStatus.TOO_MANY_REQUESTS],
	];

	for (const [isDeclared, status] of errorStatuses) {
		if (isDeclared && !documentedStatuses.has(status)) {
			decorators.push(ApiResponse({ description: STATUS_CODES[status], status, type: DtoGenerateException(status) }));
		}
	}

	if (hasForbidden || documentedStatuses.has(HttpStatus.FORBIDDEN)) {
		decorators.push(SetMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_FORBIDDEN_RESPONSE_METADATA_KEY, true));
	}

	if (hasUnauthorized || documentedStatuses.has(HttpStatus.UNAUTHORIZED)) {
		decorators.push(SetMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_UNAUTHORIZED_RESPONSE_METADATA_KEY, true));
	}

	// eslint-disable-next-line @elsikora/typescript/switch-exhaustiveness-check
	switch (metadata.route.method) {
		case RequestMethod.DELETE: {
			decorators.push(Delete(metadata.route.path));

			break;
		}

		case RequestMethod.GET: {
			decorators.push(Get(metadata.route.path));

			break;
		}

		case RequestMethod.PATCH: {
			decorators.push(Patch(metadata.route.path));

			break;
		}

		case RequestMethod.POST: {
			decorators.push(Post(metadata.route.path));

			break;
		}

		case RequestMethod.PUT: {
			decorators.push(Put(metadata.route.path));

			break;
		}

		default: {
			throw ErrorException(`ApiMethod error: Method ${String(metadata.route.method)} is not supported`);
		}
	}

	for (const securityRequirement of metadata.security?.authentication?.securityRequirements ?? []) {
		const openApiSecurityRequirement: TSwaggerSecurityRequirementObject = buildOpenApiSecurityRequirement(securityRequirement);

		decorators.push(ApiSecurity(openApiSecurityRequirement));
	}

	const beforeAuthenticationGuards: Array<CanActivate | Type<CanActivate>> = [];
	const afterAuthenticationGuards: Array<CanActivate | Type<CanActivate>> = [];
	const afterAuthorizationGuards: Array<CanActivate | Type<CanActivate>> = [];

	for (const routeGuard of options.execution?.guards ?? []) {
		if (typeof routeGuard === "function") {
			beforeAuthenticationGuards.push(routeGuard);

			continue;
		}

		// Untyped callers can pass null or primitives; reject them before the `in` checks below.
		const routeGuardEntry: unknown = routeGuard;

		if (typeof routeGuardEntry !== "object" || routeGuardEntry === null) {
			throw ErrorException(`ApiMethod error: Route guard entry of type ${routeGuardEntry === null ? "null" : typeof routeGuardEntry} must be a guard class, a guard instance, or a staged guard descriptor`);
		}

		// Any object exposing canActivate (prototype chain included) is a guard instance, whatever other fields it has.
		if ("canActivate" in routeGuard) {
			beforeAuthenticationGuards.push(routeGuard);

			continue;
		}

		const descriptorGuard: unknown = routeGuard.guard;

		if (typeof descriptorGuard !== "function" && (typeof descriptorGuard !== "object" || descriptorGuard === null || !("canActivate" in descriptorGuard))) {
			throw ErrorException("ApiMethod error: Route guard descriptor guard must be a guard class or a guard instance exposing canActivate");
		}

		switch (routeGuard.stage ?? EApiRouteGuardStage.BEFORE_AUTHENTICATION) {
			case EApiRouteGuardStage.AFTER_AUTHENTICATION: {
				afterAuthenticationGuards.push(routeGuard.guard);

				break;
			}

			case EApiRouteGuardStage.AFTER_AUTHORIZATION: {
				afterAuthorizationGuards.push(routeGuard.guard);

				break;
			}

			case EApiRouteGuardStage.BEFORE_AUTHENTICATION: {
				beforeAuthenticationGuards.push(routeGuard.guard);

				break;
			}

			default: {
				throw ErrorException(`ApiMethod error: Route guard stage ${String(routeGuard.stage)} is not supported`);
			}
		}
	}

	const authenticationGuards: Array<Type<CanActivate>> = metadata.security?.authentication?.guard ? [metadata.security.authentication.guard] : [];
	decorators.push(UseGuards(...beforeAuthenticationGuards, ...authenticationGuards, ...afterAuthenticationGuards, ApiAuthorizationGuard, ...afterAuthorizationGuards), UseInterceptors(RequestBodyShapeInterceptor, UuidCanonicalInterceptor, ...(options.execution?.interceptors ?? [])));

	return applyDecorators(...decorators);
}

/**
 * Converts grouped route auth metadata into one OpenAPI security requirement object.
 * @param {IApiRouteSecurityRequirement} securityRequirement - Route auth requirement group.
 * @returns {TSwaggerSecurityRequirementObject} OpenAPI security requirement object.
 */
function buildOpenApiSecurityRequirement(securityRequirement: IApiRouteSecurityRequirement): TSwaggerSecurityRequirementObject {
	const openApiSecurityRequirement: TSwaggerSecurityRequirementObject = {};

	for (const strategy of [...(securityRequirement.bearerStrategies ?? []), ...(securityRequirement.cookieStrategies ?? []), ...(securityRequirement.securityStrategies ?? [])]) {
		openApiSecurityRequirement[strategy] = [];
	}

	return openApiSecurityRequirement;
}
