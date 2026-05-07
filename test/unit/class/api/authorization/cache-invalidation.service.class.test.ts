import { ApiAuthorizationCacheInvalidationService } from "@class/api/authorization/cache-invalidation.service.class";
import { ApiAuthorizationHookPermissionCache } from "@class/api/authorization/hook";
import { ApiAuthorizationIamAttachmentCache, ApiAuthorizationIamDocumentCache } from "@class/api/authorization/iam";
import { describe, expect, it, vi } from "vitest";

class CacheInvalidationEntity {
	public id?: string;
}

describe("ApiAuthorizationCacheInvalidationService", () => {
	it("invalidates the full authorization cache", () => {
		const policyRegistry = {
			invalidateCache: vi.fn(),
		};
		const service = new ApiAuthorizationCacheInvalidationService(policyRegistry as never, new ApiAuthorizationIamAttachmentCache(), new ApiAuthorizationIamDocumentCache(), new ApiAuthorizationHookPermissionCache());

		service.invalidate();

		expect(policyRegistry.invalidateCache).toHaveBeenCalledWith(undefined);
	});

	it("invalidates an entity-scoped authorization cache", () => {
		const policyRegistry = {
			invalidateCache: vi.fn(),
		};
		const service = new ApiAuthorizationCacheInvalidationService(policyRegistry as never, new ApiAuthorizationIamAttachmentCache(), new ApiAuthorizationIamDocumentCache(), new ApiAuthorizationHookPermissionCache());

		service.invalidate(CacheInvalidationEntity);

		expect(policyRegistry.invalidateCache).toHaveBeenCalledWith(CacheInvalidationEntity);
	});

	it("clears IAM and hook resolver caches without exposing resolver internals", () => {
		const policyRegistry = {
			invalidateCache: vi.fn(),
		};
		const iamAttachmentCache = {
			clear: vi.fn(),
		};
		const iamDocumentCache = {
			clear: vi.fn(),
		};
		const hookPermissionCache = {
			clear: vi.fn(),
		};
		const service = new ApiAuthorizationCacheInvalidationService(policyRegistry as never, iamAttachmentCache as never, iamDocumentCache as never, hookPermissionCache as never);

		service.clearAll(CacheInvalidationEntity);

		expect(policyRegistry.invalidateCache).toHaveBeenCalledWith(CacheInvalidationEntity);
		expect(iamAttachmentCache.clear).toHaveBeenCalledOnce();
		expect(iamDocumentCache.clear).toHaveBeenCalledOnce();
		expect(hookPermissionCache.clear).toHaveBeenCalledOnce();
	});

	it("clears only IAM caches when requested", () => {
		const policyRegistry = {
			invalidateCache: vi.fn(),
		};
		const iamAttachmentCache = {
			clear: vi.fn(),
		};
		const iamDocumentCache = {
			clear: vi.fn(),
		};
		const hookPermissionCache = {
			clear: vi.fn(),
		};
		const service = new ApiAuthorizationCacheInvalidationService(policyRegistry as never, iamAttachmentCache as never, iamDocumentCache as never, hookPermissionCache as never);

		service.clearIamCache();

		expect(policyRegistry.invalidateCache).not.toHaveBeenCalled();
		expect(iamAttachmentCache.clear).toHaveBeenCalledOnce();
		expect(iamDocumentCache.clear).toHaveBeenCalledOnce();
		expect(hookPermissionCache.clear).not.toHaveBeenCalled();
	});
});
