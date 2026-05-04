import { ApiAuthorizationCacheInvalidationService } from "@class/api/authorization/cache-invalidation.service.class";
import { describe, expect, it, vi } from "vitest";

class CacheInvalidationEntity {
	public id?: string;
}

describe("ApiAuthorizationCacheInvalidationService", () => {
	it("invalidates the full authorization cache", () => {
		const policyRegistry = {
			invalidateCache: vi.fn(),
		};
		const service = new ApiAuthorizationCacheInvalidationService(policyRegistry as never);

		service.invalidate();

		expect(policyRegistry.invalidateCache).toHaveBeenCalledWith(undefined);
	});

	it("invalidates an entity-scoped authorization cache", () => {
		const policyRegistry = {
			invalidateCache: vi.fn(),
		};
		const service = new ApiAuthorizationCacheInvalidationService(policyRegistry as never);

		service.invalidate(CacheInvalidationEntity);

		expect(policyRegistry.invalidateCache).toHaveBeenCalledWith(CacheInvalidationEntity);
	});
});
