import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiControllerMethodMap } from "@type/factory/api/controller";

import { ApiMethod } from "@decorator/api/method.decorator";
import { EApiAction, EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { HttpStatus, RequestMethod } from "@nestjs/common";
import { DtoGenerate } from "@utility/dto/generate.utility";
import { ErrorException } from "@utility/error-exception.utility";

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
export function ApiControllerApplyDecorators<E>(targetMethod: TApiControllerMethodMap<E>[typeof method], entity: IApiEntity<E>, properties: IApiControllerProperties<E>, method: EApiRouteType, methodName: string, routeConfig: TApiControllerPropertiesRoute<E, typeof method>, decorators: Array<MethodDecorator> | Array<PropertyDecorator>): void {
	const responseDto: Type<unknown> | undefined = routeConfig.dto?.response ?? DtoGenerate(properties.entity, entity, method, EApiDtoType.RESPONSE, routeConfig.autoDto?.[EApiDtoType.RESPONSE], routeConfig.authentication?.guard);
	const customDecorators: Array<MethodDecorator> = [...decorators];

	switch (method) {
		case EApiRouteType.CREATE: {
			customDecorators.push(ApiMethod({ action: EApiAction.CREATE, authentication: routeConfig.authentication, entity: properties.entity, httpCode: HttpStatus.CREATED, method: RequestMethod.POST, path: "", responses: { hasConflict: true, hasInternalServerError: true, hasUnauthorized: true }, responseType: responseDto }));

			break;
		}

		case EApiRouteType.DELETE: {
			customDecorators.push(ApiMethod({ action: EApiAction.DELETE, authentication: routeConfig.authentication, entity: properties.entity, httpCode: HttpStatus.NO_CONTENT, method: RequestMethod.DELETE, path: `:${String(entity.primaryKey?.name)}`, responses: { hasInternalServerError: true, hasNotFound: true, hasUnauthorized: true }, responseType: undefined }));

			break;
		}

		case EApiRouteType.GET: {
			customDecorators.push(
				ApiMethod({
					action: EApiAction.FETCH,
					authentication: routeConfig.authentication,
					entity: properties.entity,
					httpCode: HttpStatus.OK,
					method: RequestMethod.GET,
					path: `:${String(entity.primaryKey?.name)}`,
					responses: { hasInternalServerError: true, hasNotFound: true, hasUnauthorized: true },
					responseType: responseDto,
				}),
			);

			break;
		}

		case EApiRouteType.GET_LIST: {
			customDecorators.push(
				ApiMethod({
					action: EApiAction.FETCH_LIST,
					authentication: routeConfig.authentication,
					entity: properties.entity,
					httpCode: HttpStatus.OK,
					method: RequestMethod.GET,
					path: "",
					responses: { hasInternalServerError: true, hasNotFound: true, hasUnauthorized: true },
					responseType: responseDto,
				}),
			);

			break;
		}

		case EApiRouteType.PARTIAL_UPDATE: {
			customDecorators.push(ApiMethod({ action: EApiAction.UPDATE, authentication: routeConfig.authentication, entity: properties.entity, httpCode: HttpStatus.OK, method: RequestMethod.PATCH, path: `:${String(entity.primaryKey?.name)}`, responses: { hasBadRequest: true, hasConflict: true, hasInternalServerError: true, hasNotFound: true, hasUnauthorized: true }, responseType: responseDto }));

			break;
		}

		case EApiRouteType.UPDATE: {
			customDecorators.push(ApiMethod({ action: EApiAction.UPDATE, authentication: routeConfig.authentication, entity: properties.entity, httpCode: HttpStatus.OK, method: RequestMethod.PUT, path: `:${String(entity.primaryKey?.name)}`, responses: { hasBadRequest: true, hasConflict: true, hasInternalServerError: true, hasNotFound: true, hasUnauthorized: true }, responseType: responseDto }));

			break;
		}

		default: {
			throw ErrorException(`Method ${method as string} not implemented`);
		}
	}

	if (customDecorators.length > 0) {
		for (const decorator of customDecorators) {
			const descriptor: TypedPropertyDescriptor<unknown> | undefined = Reflect.getOwnPropertyDescriptor(targetMethod, methodName);
			(decorator as MethodDecorator | PropertyDecorator)(targetMethod, methodName, descriptor ?? { value: targetMethod });
		}
	}
}
