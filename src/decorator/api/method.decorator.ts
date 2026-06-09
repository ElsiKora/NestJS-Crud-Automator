import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiMethodProperties } from "@interface/decorator/api";
import type { IApiRouteSecurityRequirement } from "@interface/decorator/api/route";
import type { CanActivate, Type } from "@nestjs/common";
import type { SecurityRequirementObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

import { ApiAuthorizationGuard } from "@class/api/authorization/guard.class";
import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiRouteType } from "@enum/decorator/api";
import { applyDecorators, Delete, Get, HttpCode, HttpStatus, Patch, Post, Put, RequestMethod, SetMetadata, UseGuards } from "@nestjs/common";
import { ApiBadRequestResponse, ApiConflictResponse, ApiExtraModels, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiSecurity, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ApiRouteBuildDiscriminatedDtoOpenApiSchema } from "@utility/api/route/discriminator";
import { ApiRouteCollectDtoWithRegisteredChildren } from "@utility/api/route/dto";
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

	if (metadata.throttling?.default) {
		decorators.push(Throttle({ default: metadata.throttling.default }));
	}

	const errors: NonNullable<IApiMethodProperties<E>["metadata"]["response"]>["errors"] = metadata.response?.errors;

	if (errors?.hasUnauthorized) {
		decorators.push(ApiUnauthorizedResponse({ description: "Unauthorized", type: DtoGenerateException(HttpStatus.UNAUTHORIZED) }));
	}

	if (errors?.hasForbidden) {
		decorators.push(ApiForbiddenResponse({ description: "Forbidden", type: DtoGenerateException(HttpStatus.FORBIDDEN) }));
	}

	if (errors?.hasInternalServerError) {
		decorators.push(ApiInternalServerErrorResponse({ description: "Internal Server Error", type: DtoGenerateException(HttpStatus.INTERNAL_SERVER_ERROR) }));
	}

	if (errors?.hasNotFound) {
		decorators.push(ApiNotFoundResponse({ description: "Not Found", type: DtoGenerateException(HttpStatus.NOT_FOUND) }));
	}

	if (errors?.hasBadRequest) {
		decorators.push(ApiBadRequestResponse({ description: "Bad Request", type: DtoGenerateException(HttpStatus.BAD_REQUEST) }));
	}

	if (errors?.hasConflict) {
		decorators.push(ApiConflictResponse({ description: "Conflict", type: DtoGenerateException(HttpStatus.CONFLICT) }));
	}

	if (errors?.hasTooManyRequests) {
		decorators.push(ApiTooManyRequestsResponse({ description: "Too Many Requests", type: DtoGenerateException(HttpStatus.TOO_MANY_REQUESTS) }));
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
		const openApiSecurityRequirement: SecurityRequirementObject = buildOpenApiSecurityRequirement(securityRequirement);

		decorators.push(ApiSecurity(openApiSecurityRequirement));
	}

	const guards: Array<CanActivate | Type<CanActivate>> = [];

	if (metadata.security?.authentication?.guard) {
		guards.push(metadata.security.authentication.guard);
	}

	guards.push(ApiAuthorizationGuard);
	decorators.push(UseGuards(...guards));

	return applyDecorators(...decorators);
}

/**
 * Converts grouped route auth metadata into one OpenAPI security requirement object.
 * @param {IApiRouteSecurityRequirement} securityRequirement - Route auth requirement group.
 * @returns {SecurityRequirementObject} OpenAPI security requirement object.
 */
function buildOpenApiSecurityRequirement(securityRequirement: IApiRouteSecurityRequirement): SecurityRequirementObject {
	const openApiSecurityRequirement: SecurityRequirementObject = {};

	for (const strategy of [...(securityRequirement.bearerStrategies ?? []), ...(securityRequirement.cookieStrategies ?? []), ...(securityRequirement.securityStrategies ?? [])]) {
		openApiSecurityRequirement[strategy] = [];
	}

	return openApiSecurityRequirement;
}
