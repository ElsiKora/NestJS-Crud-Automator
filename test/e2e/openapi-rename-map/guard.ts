import type { CanActivate } from "@nestjs/common";

import { Injectable } from "@nestjs/common";

/**
 * Accepts every request; the admin controller documents more response fields with it.
 */
@Injectable()
export class E2eRenameMapAdminGuard implements CanActivate {
	public canActivate(): boolean {
		return true;
	}
}

/**
 * Accepts every request; the public controller documents fewer response fields with it.
 */
@Injectable()
export class E2eRenameMapPublicGuard implements CanActivate {
	public canActivate(): boolean {
		return true;
	}
}
