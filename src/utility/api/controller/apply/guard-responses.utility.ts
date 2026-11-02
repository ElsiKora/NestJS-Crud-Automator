import type { CanActivate, Type } from "@nestjs/common";
import type { TApiControllerRouteHandler } from "@type/utility/api/controller";

import { ApiAuthorizationGuard } from "@class/api/authorization/guard.class";
import { ApiAuthorizationHandlerGuard } from "@class/api/authorization/handler-guard.class";
import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { HttpStatus } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/internal";
import { ApiForbiddenResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { ApiControllerCollectRouteMethods, ApiControllerGetOwnRouteMethod } from "@utility/api/controller/apply/route-methods.utility";
import { DtoGenerateException } from "@utility/dto/generate/exception.utility";

const AUTHORIZATION_GUARDS: ReadonlySet<CanActivate | Type<CanActivate>> = new Set<CanActivate | Type<CanActivate>>([ApiAuthorizationGuard, ApiAuthorizationHandlerGuard]);

/**
 * Declares the statuses of the guards `ApiMethod` cannot see: `@UseGuards` on the controller class or above the route decorator.
 * A guard can reject with `401` or refuse with `403`. The authorization guards do not count, since a securable controller answers for them: the one `ApiMethod` puts on each route, and the one `@ApiControllerSecurable` puts on the class, which refuses only a handler that startup already refuses. Guards registered with `APP_GUARD` stay out of reach, so a route documents those itself.
 * `@ApiController` calls it again when the class is instantiated, since a decorator above it writes to the class it returns.
 * @param {{ prototype: object }} target - Controller class.
 * @param {object} target.prototype - Prototype of the controller class.
 * @returns {void}
 */
export function ApiControllerApplyGuardResponses(target: { prototype: object }): void {
	const hasClassGuard: boolean = getGuards(target).length > 0;

	for (const [methodName, route] of ApiControllerCollectRouteMethods(target.prototype)) {
		const handler: TApiControllerRouteHandler = route.handler;
		// Swagger joins the descriptions of a status declared twice, so declare each one once
		const hasForbidden: boolean = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_FORBIDDEN_RESPONSE_METADATA_KEY, handler) === true;
		const hasUnauthorized: boolean = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_UNAUTHORIZED_RESPONSE_METADATA_KEY, handler) === true;
		const hasGuard: boolean = hasClassGuard || getGuards(handler).length > 0;

		if (!hasGuard || (hasForbidden && hasUnauthorized)) {
			continue;
		}

		const own: { descriptor: PropertyDescriptor; handler: TApiControllerRouteHandler } = ApiControllerGetOwnRouteMethod(target.prototype, methodName, route);

		if (!hasUnauthorized) {
			ApiUnauthorizedResponse({ description: "Unauthorized", type: DtoGenerateException(HttpStatus.UNAUTHORIZED) })(target.prototype, methodName, own.descriptor);
			Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_UNAUTHORIZED_RESPONSE_METADATA_KEY, true, own.handler);
		}

		if (!hasForbidden) {
			ApiForbiddenResponse({ description: "Forbidden", type: DtoGenerateException(HttpStatus.FORBIDDEN) })(target.prototype, methodName, own.descriptor);
			Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_FORBIDDEN_RESPONSE_METADATA_KEY, true, own.handler);
		}
	}
}

/**
 * Reads the guards `@UseGuards` set on a class or a route method, without the authorization guards.
 * @param {object} target - Class or route method.
 * @returns {Array<CanActivate | Type<CanActivate>>} The guards, none when it has no other guard.
 */
function getGuards(target: object): Array<CanActivate | Type<CanActivate>> {
	return ((Reflect.getMetadata(GUARDS_METADATA, target) ?? []) as Array<CanActivate | Type<CanActivate>>).filter((guard: CanActivate | Type<CanActivate>): boolean => !AUTHORIZATION_GUARDS.has(guard));
}
