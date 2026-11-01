import type { CanActivate, ExecutionContext } from "@nestjs/common";

import { Injectable } from "@nestjs/common";

/**
 * Accepts every request as the administrator principal.
 */
@Injectable()
export class E2eDtoNameAdminGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = { id: "admin", roles: ["admin"] };

		return true;
	}
}

/**
 * Accepts every request as the public principal.
 */
@Injectable()
export class E2eDtoNamePublicGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = { id: "public", roles: ["public"] };

		return true;
	}
}
