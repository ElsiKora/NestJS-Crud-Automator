import { AuthorizationPermissionMatches } from "@utility/authorization/permission/matches.utility";
import { describe, expect, it } from "vitest";

describe("AuthorizationPermissionMatches", () => {
	it("matches exact permissions", () => {
		expect(AuthorizationPermissionMatches("admin.user.read", "admin.user.read")).toBe(true);
		expect(AuthorizationPermissionMatches("admin.user.read", "admin.user.update")).toBe(false);
	});

	it("matches supported wildcard grants deterministically", () => {
		expect(AuthorizationPermissionMatches("admin.user.*", "admin.user.read")).toBe(true);
		expect(AuthorizationPermissionMatches("admin.*", "admin.brand.update")).toBe(true);
		expect(AuthorizationPermissionMatches("*", "admin.brand.update")).toBe(true);
		expect(AuthorizationPermissionMatches("admin.user.read", "admin.user.update")).toBe(false);
	});

	it("returns false for empty or unsupported wildcard patterns", () => {
		expect(AuthorizationPermissionMatches("", "admin.user.read")).toBe(false);
		expect(AuthorizationPermissionMatches("admin*read", "admin.user.read")).toBe(false);
		expect(AuthorizationPermissionMatches("admin.*.read", "admin.user.read")).toBe(false);
	});
});
