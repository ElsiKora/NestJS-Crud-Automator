import { EAuthorizationPermissionMatch } from "@enum/class/authorization/permission-match.enum";

import { AuthorizationPermissionMatches } from "./matches.utility";

/**
 * Checks whether granted permissions satisfy the required permissions.
 * An empty granted or required list never matches.
 * @param {Array<string>} grantedPermissions - Permissions granted to the subject.
 * @param {Array<string>} requiredPermissions - Concrete permissions required by the rule.
 * @param {{ match?: EAuthorizationPermissionMatch }} [options] - Required permission matching strategy.
 * @param {EAuthorizationPermissionMatch} [options.match] - `ANY` requires one matching permission, `ALL` requires every permission.
 * @returns {boolean} True when the granted permissions satisfy the requested match strategy.
 */
export function AuthorizationPermissionSetMatches(grantedPermissions: Array<string>, requiredPermissions: Array<string>, options: { match?: EAuthorizationPermissionMatch } = {}): boolean {
	if (grantedPermissions.length === 0 || requiredPermissions.length === 0) {
		return false;
	}

	const matchMode: EAuthorizationPermissionMatch = options.match ?? EAuthorizationPermissionMatch.ANY;

	const hasRequiredPermission = (requiredPermission: string): boolean => grantedPermissions.some((grantedPermission: string) => AuthorizationPermissionMatches(grantedPermission, requiredPermission));

	if (matchMode === EAuthorizationPermissionMatch.ALL) {
		return requiredPermissions.every((requiredPermission: string) => hasRequiredPermission(requiredPermission));
	}

	return requiredPermissions.some((requiredPermission: string) => hasRequiredPermission(requiredPermission));
}
