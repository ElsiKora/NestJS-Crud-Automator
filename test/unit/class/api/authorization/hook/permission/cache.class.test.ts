import { ApiAuthorizationHookPermissionCache } from "@class/api/authorization/hook";
import { EApiAuthorizationPrincipalType } from "@enum/class/authorization";
import { describe, expect, it } from "vitest";

describe("ApiAuthorizationHookPermissionCache", () => {
	it("clears hook permission cache entries", () => {
		const cache = new ApiAuthorizationHookPermissionCache();
		const principal = { attributes: {}, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER };

		cache.set(principal, ["read"]);
		cache.clear();

		expect(cache.get(principal)).toBeUndefined();
	});
});
