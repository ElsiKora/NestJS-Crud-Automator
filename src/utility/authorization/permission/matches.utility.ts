/**
 * Checks whether a granted permission satisfies a required permission.
 * Supported wildcard forms are `*`, `<prefix>.*`, and exact matches.
 * Wildcards are evaluated only on granted permissions.
 * @param {string} grantedPermission - Permission granted to the principal.
 * @param {string} requiredPermission - Concrete permission required by the rule.
 * @returns {boolean} True when the granted permission satisfies the requirement.
 */
export function AuthorizationPermissionMatches(grantedPermission: string, requiredPermission: string): boolean {
	if (grantedPermission.length === 0 || requiredPermission.length === 0) {
		return false;
	}

	if (grantedPermission === "*") {
		return true;
	}

	if (!grantedPermission.includes("*")) {
		return grantedPermission === requiredPermission;
	}

	if (!grantedPermission.endsWith(".*")) {
		return false;
	}

	// eslint-disable-next-line @elsikora/typescript/no-magic-numbers
	const permissionPrefix: string = grantedPermission.slice(0, -2);

	if (permissionPrefix.length === 0) {
		return false;
	}

	return requiredPermission.startsWith(`${permissionPrefix}.`);
}
