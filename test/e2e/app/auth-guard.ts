import type { ExecutionContext } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";

import { Injectable } from "@nestjs/common";

import { E2E_OWNER_ID } from "./constants";

@Injectable()
export class TestAuthGuard implements IAuthGuard {
	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = this.getRequest(context);
		const roleHeader = request?.headers?.["x-role"];
		const rolesHeader = request?.headers?.["x-user-roles"];
		const userRoleHeader = request?.headers?.["x-user-role"];
		const permissionHeader = request?.headers?.["x-user-permission"];
		const permissionsHeader = request?.headers?.["x-user-permissions"];
		const userIdHeader = request?.headers?.["x-user-id"];
		const userUuidHeader = request?.headers?.["x-user-uuid"];
		const userEmailHeader = request?.headers?.["x-user-email"];
		const policyTransformHeader = request?.headers?.["x-policy-transform"];

		const role = Array.isArray(roleHeader) ? roleHeader[0] : roleHeader;
		const rolesRaw = Array.isArray(rolesHeader) ? rolesHeader[0] : rolesHeader;
		const userRole = Array.isArray(userRoleHeader) ? userRoleHeader[0] : userRoleHeader;
		const permission = Array.isArray(permissionHeader) ? permissionHeader[0] : permissionHeader;
		const permissionsRaw = Array.isArray(permissionsHeader) ? permissionsHeader[0] : permissionsHeader;
		const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;
		const userUuid = Array.isArray(userUuidHeader) ? userUuidHeader[0] : userUuidHeader;
		const userEmail = Array.isArray(userEmailHeader) ? userEmailHeader[0] : userEmailHeader;
		const policyTransform = Array.isArray(policyTransformHeader) ? policyTransformHeader[0] : policyTransformHeader;

		const hasIdentityHeaders = userIdHeader !== undefined || userUuidHeader !== undefined || userEmailHeader !== undefined;
		const resolvedRoles =
			typeof rolesRaw === "string"
				? rolesRaw
						.split(",")
						.map((item) => item.trim())
						.filter(Boolean)
				: [];
		const resolvedPermissions =
			typeof permissionsRaw === "string"
				? permissionsRaw
						.split(",")
						.map((item) => item.trim())
						.filter(Boolean)
				: [];
		const user: Record<string, unknown> = {};

		if (typeof userId === "string" && userId.length > 0) {
			user.id = userId;
		}

		if (typeof userUuid === "string" && userUuid.length > 0) {
			user.uuid = userUuid;
		}

		if (typeof userEmail === "string" && userEmail.length > 0) {
			user.email = userEmail;
		}

		if (!hasIdentityHeaders) {
			user.id = E2E_OWNER_ID;
		}

		if (resolvedRoles.length > 0) {
			user.roles = resolvedRoles;
		} else if (role) {
			user.roles = [String(role)];
		}

		if (typeof userRole === "string" && userRole.length > 0) {
			user.role = userRole;
		}

		if (resolvedPermissions.length > 0) {
			user.permissions = resolvedPermissions;
		}

		if (typeof permission === "string" && permission.length > 0) {
			user.permission = permission;
		}

		if (policyTransform === "true") {
			user.applyPolicyTransform = true;
		}

		request.user = user;

		return true;
	}

	public getRequest(context: ExecutionContext): any {
		return context.switchToHttp().getRequest();
	}

	public async logIn<TRequest extends { logIn: Function } = any>(_request: TRequest): Promise<void> {
		return Promise.resolve();
	}

	public handleRequest<TUser = any>(_err: any, user: any, _info: any, _context: ExecutionContext, _status?: any): TUser {
		return user;
	}

	public getAuthenticateOptions(_context: ExecutionContext): undefined {
		return undefined;
	}
}
