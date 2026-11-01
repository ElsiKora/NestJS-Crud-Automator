import type { ExceptionFilter, Type } from "@nestjs/common";

import { ApiAuthorizationHandlerGuard } from "@class/api/authorization/handler-guard.class";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { UseFilters, UseGuards } from "@nestjs/common";
import { ApiControllerApplyForbiddenResponse } from "@utility/api/controller/apply/forbidden-response.utility";
import { AuthorizationCreateModuleCheck } from "@utility/authorization/create-module-check.utility";

const authorizationModuleCheck: Type<ExceptionFilter> = AuthorizationCreateModuleCheck();

/**
 * Decorator that marks a controller as securable, enabling automatic RBAC guard application.
 * Without this decorator the authorization guard short-circuits and controller methods remain unsecured.
 * An application that serves a securable controller without `ApiAuthorizationModule` fails startup, and a handler of the controller that does not go through authorization is denied per request.
 * @returns {ClassDecorator} Class decorator that enables authorization for the controller.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-controller/api-controller-securable | API Reference - ApiControllerSecurable}
 */
export function ApiControllerSecurable(): ClassDecorator {
	return applyApiControllerSecurableMetadata;
}

/**
 * Applies controller securable metadata, the check for `ApiAuthorizationModule` and the guard that denies a handler without authorization.
 * @param {object} target - Decorated controller target.
 * @returns {void}
 */
function applyApiControllerSecurableMetadata(target: object): void {
	Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, target);
	UseFilters(authorizationModuleCheck)(target as Type<unknown>);
	UseGuards(ApiAuthorizationHandlerGuard)(target as Type<unknown>);
	ApiControllerApplyForbiddenResponse(target);
}
