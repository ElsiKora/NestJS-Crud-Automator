import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { TApiControllerRouteHandler } from "@type/utility/api/controller";

import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { HttpStatus } from "@nestjs/common";
import { ApiForbiddenResponse } from "@nestjs/swagger";
import { ApiControllerCollectRouteMethods, ApiControllerGetOwnRouteMethod } from "@utility/api/controller/apply/route-methods.utility";
import { DtoGenerateException } from "@utility/dto/generate/exception.utility";

/**
 * Declares the statuses a securable controller with an authorization block adds to its routes.
 * The authorization guard runs on each `ApiMethod` route and refuses denied requests with `403`, on generated and custom routes alike.
 * A generated CREATE refuses a body outside the policy scope with `403` too, and rolls the row back, so a securable controller adds no `404` of its own.
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

	for (const [methodName, route] of ApiControllerCollectRouteMethods(target.prototype)) {
		const handler: TApiControllerRouteHandler = route.handler;
		// Swagger joins the descriptions of a status declared twice, so declare each one once
		const hasForbidden: boolean = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_FORBIDDEN_RESPONSE_METADATA_KEY, handler) === true;

		if (hasForbidden) {
			continue;
		}

		const own: { descriptor: PropertyDescriptor; handler: TApiControllerRouteHandler } = ApiControllerGetOwnRouteMethod(target.prototype, methodName, route);

		forbiddenDecorator(target.prototype, methodName, own.descriptor);
		Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_FORBIDDEN_RESPONSE_METADATA_KEY, true, own.handler);
	}
}
