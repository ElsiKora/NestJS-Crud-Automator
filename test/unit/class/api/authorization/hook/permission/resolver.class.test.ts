import { ApiAuthorizationHookPermissionCache, ApiAuthorizationHookPermissionResolver } from "@class/api/authorization/hook";
import { EApiAuthorizationCacheMode, EApiAuthorizationPrincipalType } from "@enum/class/authorization";
import { describe, expect, it, vi } from "vitest";

describe("ApiAuthorizationHookPermissionResolver", () => {
	it("reads hook permissions independently and fails closed without a stale fallback", async () => {
		const cache = new ApiAuthorizationHookPermissionCache();
		const principal = { attributes: {}, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER };
		const sourceError = new Error("permission source unavailable");
		const source = {
			getPermissions: vi.fn().mockResolvedValueOnce(["read"]).mockResolvedValueOnce(["write"]).mockRejectedValueOnce(sourceError),
		};
		const resolver = new ApiAuthorizationHookPermissionResolver(cache, [source]);

		await expect(resolver.resolve(principal)).resolves.toEqual(["read"]);
		await expect(resolver.resolve(principal)).resolves.toEqual(["write"]);
		await expect(resolver.resolve(principal)).rejects.toBe(sourceError);

		expect(source.getPermissions).toHaveBeenCalledTimes(3);
		expect(cache.get(principal)).toBeUndefined();
	});

	it("deduplicates permissions only within one source-first resolution", async () => {
		const firstSource = {
			getPermissions: vi.fn(async () => ["read", "write"]),
		};
		const secondSource = {
			getPermissions: vi.fn(async () => ["read"]),
		};
		const resolver = new ApiAuthorizationHookPermissionResolver(new ApiAuthorizationHookPermissionCache(), [firstSource, secondSource]);
		const principal = { attributes: {}, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER };

		await expect(resolver.resolve(principal)).resolves.toEqual(["read", "write"]);
		await expect(resolver.resolve(principal)).resolves.toEqual(["read", "write"]);

		expect(firstSource.getPermissions).toHaveBeenCalledTimes(2);
		expect(secondSource.getPermissions).toHaveBeenCalledTimes(2);
	});

	it("uses hook permission cache hits without calling sources", async () => {
		const cache = new ApiAuthorizationHookPermissionCache();
		cache.configure({
			maxEntries: 10,
			mode: EApiAuthorizationCacheMode.MEMORY,
			ttlMs: 60_000,
		});
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
