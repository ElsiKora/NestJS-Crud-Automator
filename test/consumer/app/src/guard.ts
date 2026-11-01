import type { CanActivate, ExecutionContext } from "@nestjs/common";

import { Injectable } from "@nestjs/common";

/**
 * Test authentication: `x-user-id` becomes the principal id and `x-roles` a comma-separated role list.
 */
@Injectable()
export class SmokeAuthGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		const request: { headers: Record<string, string | undefined>; user?: unknown } = context.switchToHttp().getRequest();
		const roles: Array<string> = (request.headers["x-roles"] ?? "").split(",").filter((role: string): boolean => role.length > 0);

		request.user = { id: request.headers["x-user-id"], roles };

		return typeof request.headers["x-user-id"] === "string";
	}
}
