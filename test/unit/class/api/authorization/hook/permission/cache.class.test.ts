import { ApiAuthorizationHookPermissionCache } from "@class/api/authorization/hook";
import { EApiAuthorizationCacheMode, EApiAuthorizationPrincipalType } from "@enum/class/authorization";
import { describe, expect, it } from "vitest";

describe("ApiAuthorizationHookPermissionCache", () => {
	it("does not store permissions in source-first mode", () => {
		const cache = new ApiAuthorizationHookPermissionCache();
		const principal = { attributes: {}, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER };

		cache.set(principal, ["read"]);

		expect(cache.get(principal)).toBeUndefined();
	});

	it("clears hook permission cache entries", () => {
		const cache = new ApiAuthorizationHookPermissionCache();
		cache.configure({
			maxEntries: 10,
			mode: EApiAuthorizationCacheMode.MEMORY,
			ttlMs: 60_000,
		});
		const principal = { attributes: {}, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER };

		cache.set(principal, ["read"]);
		cache.clear();

		expect(cache.get(principal)).toBeUndefined();
	});
});
