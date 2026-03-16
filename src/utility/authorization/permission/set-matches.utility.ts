import { EApiAuthorizationPermissionMatch } from "@enum/class/authorization";

import { AuthorizationPermissionMatches } from "./matches.utility";

/**
 * Checks whether granted permissions satisfy the required permissions.
 * An empty granted or required list never matches.
 * @param {Array<string>} grantedPermissions - Permissions granted to the principal.
 * @param {Array<string>} requiredPermissions - Concrete permissions required by the rule.
 * @param {{ match?: EApiAuthorizationPermissionMatch }} [options] - Required permission matching strategy.
 * @param {EApiAuthorizationPermissionMatch} [options.match] - `ANY` requires one matching permission, `ALL` requires every permission.
 * @returns {boolean} True when the granted permissions satisfy the requested match strategy.
 */
export function AuthorizationPermissionSetMatches(grantedPermissions: ReadonlyArray<string>, requiredPermissions: ReadonlyArray<string>, options: { match?: EApiAuthorizationPermissionMatch } = {}): boolean {
	if (grantedPermissions.length === 0 || requiredPermissions.length === 0) {
		return false;
	}

	const matchMode: EApiAuthorizationPermissionMatch = options.match ?? EApiAuthorizationPermissionMatch.ANY;

	const hasRequiredPermission = (requiredPermission: string): boolean => grantedPermissions.some((grantedPermission: string) => AuthorizationPermissionMatches(grantedPermission, requiredPermission));

	if (matchMode === EApiAuthorizationPermissionMatch.ALL) {
		return requiredPermissions.every((requiredPermission: string) => hasRequiredPermission(requiredPermission));
	}

	return requiredPermissions.some((requiredPermission: string) => hasRequiredPermission(requiredPermission));
}
