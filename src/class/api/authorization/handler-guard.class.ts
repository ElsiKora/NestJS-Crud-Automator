import type { CanActivate, ExecutionContext } from "@nestjs/common";

import { Injectable } from "@nestjs/common";
import { AuthorizationIsHandlerAuthorized } from "@utility/authorization/is-handler-authorized.utility";
import { LoggerUtility } from "@utility/logger.utility";

const authorizationHandlerGuardLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationHandlerGuard");

/**
 * Denies a handler of a securable controller that does not go through authorization.
 * `@ApiControllerSecurable` attaches it to the class, so it runs in every scope and on every transport, also where startup validation cannot see the function Nest serves, such as a handler that a request-scoped controller replaces in its constructor.
 * It evaluates no policy. It returns false instead of throwing because Nest then answers in the terms of the transport: 403 over HTTP, an error reply over a microservice transport.
 */
@Injectable()
export class ApiAuthorizationHandlerGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		const controller: object = context.getClass();
		const handler: object = context.getHandler();

		if (AuthorizationIsHandlerAuthorized(controller, handler)) {
			return true;
		}

		authorizationHandlerGuardLogger.warn(`Access denied: controller "${(controller as { name: string }).name}" handler "${(handler as { name: string }).name}" does not go through authorization`);

		return false;
	}
}
