import { ApiAuthorizationGuard } from "@class/api/authorization/guard.class";
import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { GUARDS_METADATA } from "@nestjs/common/internal";

/**
 * Tells whether a handler Nest serves on a securable controller goes through authorization.
 * It needs the route metadata of this library on the handler, and `ApiAuthorizationGuard` or a subclass of it in `@UseGuards` on the handler or the controller. A guard instance and `APP_GUARD` do not count, because neither can be told to run this guard for this handler.
 * @param {object} controller - Controller class.
 * @param {unknown} handler - The function Nest serves.
 * @returns {boolean} Whether the handler goes through authorization.
 */
export function AuthorizationIsHandlerAuthorized(controller: object, handler: unknown): boolean {
	if (typeof handler !== "function" || Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, handler) === undefined) {
		return false;
	}

	const guards: Array<unknown> = [...((Reflect.getMetadata(GUARDS_METADATA, handler) as Array<unknown> | undefined) ?? []), ...((Reflect.getMetadata(GUARDS_METADATA, controller) as Array<unknown> | undefined) ?? [])];

	return guards.some((guard: unknown): boolean => guard === ApiAuthorizationGuard || (typeof guard === "function" && guard.prototype instanceof ApiAuthorizationGuard));
}
