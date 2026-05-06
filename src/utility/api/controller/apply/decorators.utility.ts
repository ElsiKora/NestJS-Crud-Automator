import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteMetadata } from "@interface/decorator/api";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiControllerMethodMap } from "@type/factory/api/controller";

import { ApiMethod } from "@decorator/api/method.decorator";
import { EApiAction, EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { HttpStatus, RequestMethod } from "@nestjs/common";
import { ApiControllerGetDto } from "@utility/api/controller/get/dto.utility";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Applies appropriate decorators to controller methods based on the route type.
 * Configures HTTP methods, status codes, paths, and response types for API endpoints.
 * @param {Function} targetMethod - The controller method to apply decorators to
 * @param {IApiEntity<E>} entity - The entity metadata for the controller
 * @param {IApiControllerProperties<E>} properties - Controller configuration properties
 * @param {EApiRouteType} method - The type of route to configure (CREATE, DELETE, GET, etc.)
 * @param {string} methodName - The name of the method being decorated
 * @param {TApiControllerPropertiesRoute<E, typeof method>} routeConfig - Route-specific configuration
 * @param {Array<MethodDecorator> | Array<PropertyDecorator>} decorators - Additional decorators to apply
 * @returns {void}
 * @throws {Error} If the method type is not implemented
 * @template E - The entity type
 */
export function ApiControllerApplyDecorators<E extends IApiBaseEntity>(targetMethod: TApiControllerMethodMap<E>[typeof method], entity: IApiEntity<E>, properties: IApiControllerProperties<E>, method: EApiRouteType, methodName: string, routeConfig: TApiControllerPropertiesRoute<E, typeof method>, decorators: Array<MethodDecorator> | Array<PropertyDecorator>): void {
	const responseDto: Type<unknown> | undefined = ApiControllerGetDto(properties, entity, method, EApiDtoType.RESPONSE, routeConfig);
	const customDecorators: Array<MethodDecorator> = [...decorators];

	switch (method) {
		case EApiRouteType.CREATE: {
			customDecorators.push(ApiMethod({ metadata: createRouteMetadata(properties, routeConfig, method, RequestMethod.POST, "", HttpStatus.CREATED, responseDto, { hasConflict: true, hasInternalServerError: true, hasUnauthorized: true }, EApiAction.CREATE) }));

			break;
		}

		case EApiRouteType.DELETE: {
			customDecorators.push(ApiMethod({ metadata: createRouteMetadata(properties, routeConfig, method, RequestMethod.DELETE, `:${String(entity.primaryKey?.name)}`, HttpStatus.NO_CONTENT, undefined, { hasInternalServerError: true, hasNotFound: true, hasUnauthorized: true }, EApiAction.DELETE) }));

			break;
		}

		case EApiRouteType.GET: {
			customDecorators.push(
				ApiMethod({
					metadata: createRouteMetadata(properties, routeConfig, method, RequestMethod.GET, `:${String(entity.primaryKey?.name)}`, HttpStatus.OK, responseDto, { hasInternalServerError: true, hasNotFound: true, hasUnauthorized: true }, EApiAction.FETCH),
				}),
			);

			break;
		}

		case EApiRouteType.GET_LIST: {
			customDecorators.push(
				ApiMethod({
					metadata: createRouteMetadata(properties, routeConfig, method, RequestMethod.GET, "", HttpStatus.OK, responseDto, { hasInternalServerError: true, hasNotFound: true, hasUnauthorized: true }, EApiAction.FETCH_LIST),
				}),
			);

			break;
		}

		case EApiRouteType.PARTIAL_UPDATE: {
			customDecorators.push(ApiMethod({ metadata: createRouteMetadata(properties, routeConfig, method, RequestMethod.PATCH, `:${String(entity.primaryKey?.name)}`, HttpStatus.OK, responseDto, { hasBadRequest: true, hasConflict: true, hasInternalServerError: true, hasNotFound: true, hasUnauthorized: true }, EApiAction.UPDATE) }));

			break;
		}

		case EApiRouteType.UPDATE: {
			customDecorators.push(ApiMethod({ metadata: createRouteMetadata(properties, routeConfig, method, RequestMethod.PUT, `:${String(entity.primaryKey?.name)}`, HttpStatus.OK, responseDto, { hasBadRequest: true, hasConflict: true, hasInternalServerError: true, hasNotFound: true, hasUnauthorized: true }, EApiAction.UPDATE) }));

			break;
		}

		default: {
			throw ErrorException(`Method ${method as string} not implemented`);
		}
	}

	if (customDecorators.length > 0) {
		for (const decorator of customDecorators) {
			const descriptor: TypedPropertyDescriptor<unknown> | undefined = Reflect.getOwnPropertyDescriptor(targetMethod, methodName);
			decorator(targetMethod, methodName, descriptor ?? { value: targetMethod });
		}
	}
}

/**
 * Creates unified route metadata for a generated controller route.
 * @template E - Entity type owned by the controller.
 * @param {IApiControllerProperties<E>} properties - Controller configuration that owns the generated route.
 * @param {TApiControllerPropertiesRoute<E, EApiRouteType>} routeConfig - Route-specific configuration.
 * @param {EApiRouteType} routeType - CRUD route type being generated.
 * @param {RequestMethod} requestMethod - Nest request method for the route.
 * @param {string} path - Route path segment.
 * @param {HttpStatus} status - Successful HTTP status code.
 * @param {Type<unknown> | undefined} responseType - Swagger and serialization response DTO type.
 * @param {NonNullable<IApiRouteMetadata<E>["response"]>["errors"]} errors - Standard error response flags.
 * @param {EApiAction} documentationAction - Action label used for generated documentation.
 * @returns {IApiRouteMetadata<E>} Route metadata consumed by ApiMethod and the route runtime.
 */
function createRouteMetadata<E extends IApiBaseEntity>(properties: IApiControllerProperties<E>, routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType>, routeType: EApiRouteType, requestMethod: RequestMethod, path: string, status: HttpStatus, responseType: Type<unknown> | undefined, errors: NonNullable<IApiRouteMetadata<E>["response"]>["errors"], documentationAction: EApiAction): IApiRouteMetadata<E> {
	return {
		documentation: {
			summary: documentationAction,
		},
		resource: {
			action: routeType,
			entity: properties.entity as Type<E>,
		},
		response: {
			errors,
			serialization: routeConfig.response?.serialization ?? {
				isEnabled: responseType !== undefined && status !== HttpStatus.NO_CONTENT,
			},
			status,
			type: responseType,
		},
		route: {
			method: requestMethod,
			path,
			type: routeType,
		},
		security: {
			authentication: routeConfig.security?.authentication,
			authorization: properties.authorization
				? {
						mode: routeConfig.security?.authorization?.mode ?? properties.authorization.defaultMode,
					}
				: undefined,
		},
	};
}
