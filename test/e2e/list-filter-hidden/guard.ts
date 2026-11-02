import type { CanActivate, ExecutionContext } from "@nestjs/common";

import { Injectable } from "@nestjs/common";

export const E2E_LIST_HIDDEN_USER_ID: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

@Injectable()
export class E2eListHiddenUserGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		const request: { user?: unknown } = context.switchToHttp().getRequest();

		request.user = { id: E2E_LIST_HIDDEN_USER_ID };

		return true;
	}
}
