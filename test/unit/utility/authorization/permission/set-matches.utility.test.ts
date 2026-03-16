import { EApiAuthorizationPermissionMatch } from "@enum/class/authorization";
import { AuthorizationPermissionSetMatches } from "@utility/authorization/permission/set-matches.utility";
import { describe, expect, it } from "vitest";

describe("AuthorizationPermissionSetMatches", () => {
	it("uses ANY matching by default", () => {
		expect(AuthorizationPermissionSetMatches(["admin.user.*"], ["admin.user.read", "admin.user.delete"])).toBe(true);
		expect(AuthorizationPermissionSetMatches(["operator.user.read"], ["admin.user.read", "admin.user.delete"])).toBe(false);
	});

	it("supports ALL matching with wildcards", () => {
		expect(AuthorizationPermissionSetMatches(["admin.user.*"], ["admin.user.read", "admin.user.update"], { match: EApiAuthorizationPermissionMatch.ALL })).toBe(true);
		expect(AuthorizationPermissionSetMatches(["admin.user.read"], ["admin.user.read", "admin.user.update"], { match: EApiAuthorizationPermissionMatch.ALL })).toBe(false);
	});

	it("returns false when granted or required permissions are empty", () => {
		expect(AuthorizationPermissionSetMatches([], ["admin.user.read"])).toBe(false);
		expect(AuthorizationPermissionSetMatches(["admin.user.read"], [])).toBe(false);
	});
});
