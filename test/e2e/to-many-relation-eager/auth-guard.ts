import type { CanActivate, ExecutionContext } from "@nestjs/common";

import { Injectable } from "@nestjs/common";

@Injectable()
export class E2eEagerAuthGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		const request: { headers: Record<string, string | undefined>; user?: unknown } = context.switchToHttp().getRequest();
		const ownerId: string | undefined = request.headers["x-owner-id"];

		if (!ownerId) {
			return false;
		}

		request.user = { id: ownerId };

		return true;
	}
}
