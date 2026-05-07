import { ApiAuthorizationHookPermissionCache, ApiAuthorizationHookPermissionResolver } from "@class/api/authorization/hook";
import { EApiAuthorizationPrincipalType } from "@enum/class/authorization";
import { describe, expect, it, vi } from "vitest";

describe("ApiAuthorizationHookPermissionResolver", () => {
	it("uses hook permission cache hits without calling sources", async () => {
		const cache = new ApiAuthorizationHookPermissionCache();
		const principal = { attributes: {}, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER };
		const source = {
			getPermissions: vi.fn(async () => ["write"]),
		};
		const resolver = new ApiAuthorizationHookPermissionResolver(cache, [source]);

		cache.set(principal, ["read"]);

		await expect(resolver.resolve(principal)).resolves.toEqual(["read"]);
		expect(source.getPermissions).not.toHaveBeenCalled();
	});
});
