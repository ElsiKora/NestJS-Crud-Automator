import type { IApiAuthorizationPrincipal, IApiHookPermissionSource } from "../../../dist/esm/index";

export const e2eHookPermissionSource: IApiHookPermissionSource = {
	async getPermissions(principal: IApiAuthorizationPrincipal): Promise<ReadonlyArray<string>> {
		const claims: Record<string, unknown> | undefined = principal.claims;
		const permissions: unknown = claims?.permissions;

		if (Array.isArray(permissions)) {
			return permissions.filter((permission: unknown): permission is string => typeof permission === "string" && permission.length > 0);
		}

		if (typeof permissions === "string" && permissions.length > 0) {
			return [permissions];
		}

		return [];
	},
};
