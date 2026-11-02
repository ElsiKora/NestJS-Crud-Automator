import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties, IApiRouteMetadata } from "@interface/decorator/api";
import type { TApiControllerRouteHandler } from "@type/utility/api/controller";

import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { EApiRouteType } from "@enum/decorator/api";
import { HttpStatus } from "@nestjs/common";
import { ApiForbiddenResponse, ApiNotFoundResponse } from "@nestjs/swagger";
import { ApiControllerCollectRouteMethods, ApiControllerGetOwnRouteMethod } from "@utility/api/controller/apply/route-methods.utility";
import { DtoGenerateException } from "@utility/dto/generate/exception.utility";

/**
 * Declares the statuses a securable controller with an authorization block adds to its routes.
 * The authorization guard runs on each `ApiMethod` route and refuses denied requests with `403`, on generated and custom routes alike.
 * A policy scope also applies to the row a generated CREATE reads back after it wrote it, so a body outside the scope answers `404`. The scope is only known per request, so every generated CREATE of the controller declares it.
 * `@ApiController` and `@ApiControllerSecurable` both call it, so the result does not depend on the decorator order.
 * Swagger keeps responses on the handler function, so an inherited route gets its own handler on this class and the handler it inherits, which sibling controllers share, stays untouched.
 * @param {{ prototype: object }} target - Controller class, which is the wrapper `@ApiController` returns once it ran.
 * @param {object} target.prototype - Prototype of the controller class.
 * @returns {void}
 */
export function ApiControllerApplySecurableResponses(target: { prototype: object }): void {
	const isSecurable: boolean = Boolean(Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, target));
	const properties: IApiControllerProperties<IApiBaseEntity> | undefined = Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY, target) as IApiControllerProperties<IApiBaseEntity> | undefined;

	if (!isSecurable || !properties?.authorization) {
		return;
	}

	const forbiddenDecorator: MethodDecorator = ApiForbiddenResponse({ description: "Forbidden", type: DtoGenerateException(HttpStatus.FORBIDDEN) });
	const notFoundDecorator: MethodDecorator = ApiNotFoundResponse({ description: "Not Found", type: DtoGenerateException(HttpStatus.NOT_FOUND) });

	for (const [methodName, route] of ApiControllerCollectRouteMethods(target.prototype)) {
		const handler: TApiControllerRouteHandler = route.handler;
		const routeMetadata: IApiRouteMetadata<IApiBaseEntity> = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, handler) as IApiRouteMetadata<IApiBaseEntity>;
		// Swagger joins the descriptions of a status declared twice, so declare each one once
		const hasForbidden: boolean = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_FORBIDDEN_RESPONSE_METADATA_KEY, handler) === true;
		const hasScopedNotFound: boolean = isGeneratedCreate(routeMetadata, handler) && !declaresNotFound(routeMetadata);

		if (hasForbidden && !hasScopedNotFound) {
			continue;
		}

		const own: { descriptor: PropertyDescriptor; handler: TApiControllerRouteHandler } = ApiControllerGetOwnRouteMethod(target.prototype, methodName, route);

		if (!hasForbidden) {
			forbiddenDecorator(target.prototype, methodName, own.descriptor);
			Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_FORBIDDEN_RESPONSE_METADATA_KEY, true, own.handler);
		}

		if (hasScopedNotFound) {
			notFoundDecorator(target.prototype, methodName, own.descriptor);
			Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, { ...routeMetadata, response: { ...routeMetadata.response, errors: { ...routeMetadata.response?.errors, hasNotFound: true } } }, own.handler);
		}
	}
}

/**
 * Checks whether the route already declares `404`, from a response flag or a status it documents itself.
 * @param {IApiRouteMetadata<IApiBaseEntity>} routeMetadata - Route metadata.
 * @returns {boolean} Whether `404` is declared.
 */
function declaresNotFound(routeMetadata: IApiRouteMetadata<IApiBaseEntity>): boolean {
	return !!routeMetadata.response?.errors?.hasNotFound || (routeMetadata.documentation?.response?.statuses ?? []).some((response: { status: unknown }): boolean => response.status === HttpStatus.NOT_FOUND);
}

/**
 * Checks whether the route is a generated CREATE. An `ApiMethod` or `ApiRouteCustom` route may name the CREATE type too, but it never reads the row back.
 * @param {IApiRouteMetadata<IApiBaseEntity>} routeMetadata - Route metadata.
 * @param {TApiControllerRouteHandler} handler - Route method.
 * @returns {boolean} Whether the route is a generated CREATE.
 */
function isGeneratedCreate(routeMetadata: IApiRouteMetadata<IApiBaseEntity>, handler: TApiControllerRouteHandler): boolean {
	return routeMetadata.route.type === EApiRouteType.CREATE && Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_GENERATED_METADATA_KEY, handler) === true;
}
