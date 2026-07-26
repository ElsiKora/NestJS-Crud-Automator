import { ApiAuthorizationIamAttachmentCache, ApiAuthorizationIamAttachmentResolver } from "@class/api/authorization/iam";
import { EApiAuthorizationCacheMode, EApiAuthorizationPrincipalType } from "@enum/class/authorization";
import { describe, expect, it, vi } from "vitest";

describe("ApiAuthorizationIamAttachmentResolver", () => {
	it("reads IAM attachments independently and fails closed without a stale fallback", async () => {
		const cache = new ApiAuthorizationIamAttachmentCache();
		const principal = { attributes: {}, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER };
		const initialAttachments = {
			attachments: [{ policyId: "policy-a", principalId: "user-1", principalType: EApiAuthorizationPrincipalType.USER }],
			boundaries: [],
		};
		const updatedAttachments = {
			attachments: [{ policyId: "policy-b", principalId: "user-1", principalType: EApiAuthorizationPrincipalType.USER }],
			boundaries: [],
		};
		const sourceError = new Error("attachment source unavailable");
		const source = {
			getAttachments: vi.fn().mockResolvedValueOnce(initialAttachments).mockResolvedValueOnce(updatedAttachments).mockRejectedValueOnce(sourceError),
		};
		const resolver = new ApiAuthorizationIamAttachmentResolver(cache, [source]);

		await expect(resolver.resolve(principal)).resolves.toEqual(initialAttachments);
		await expect(resolver.resolve(principal)).resolves.toEqual(updatedAttachments);
		await expect(resolver.resolve(principal)).rejects.toBe(sourceError);

		expect(source.getAttachments).toHaveBeenCalledTimes(3);
		expect(cache.get(principal)).toBeUndefined();
	});

	it("deduplicates IAM attachments only within one source-first resolution", async () => {
		const principal = { attributes: {}, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER };
		const duplicateAttachments = {
			attachments: [{ policyId: "policy-a", principalId: "user-1", principalType: EApiAuthorizationPrincipalType.USER }],
			boundaries: [{ policyId: "boundary-a", principalId: "user-1", principalType: EApiAuthorizationPrincipalType.USER }],
		};
		const firstSource = {
			getAttachments: vi.fn(async () => duplicateAttachments),
		};
		const secondSource = {
			getAttachments: vi.fn(async () => duplicateAttachments),
		};
		const resolver = new ApiAuthorizationIamAttachmentResolver(new ApiAuthorizationIamAttachmentCache(), [firstSource, secondSource]);

		await expect(resolver.resolve(principal)).resolves.toEqual(duplicateAttachments);
		await expect(resolver.resolve(principal)).resolves.toEqual(duplicateAttachments);

		expect(firstSource.getAttachments).toHaveBeenCalledTimes(2);
		expect(secondSource.getAttachments).toHaveBeenCalledTimes(2);
	});

	it("stores resolved IAM attachments in the attachment cache", async () => {
		const cache = new ApiAuthorizationIamAttachmentCache();
		cache.configure({
			maxEntries: 10,
			mode: EApiAuthorizationCacheMode.MEMORY,
			ttlMs: 60_000,
		});
		const principal = { attributes: {}, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER };
		const resolvedAttachments = {
			attachments: [{ policyId: "policy-a", principalId: "user-1", principalType: EApiAuthorizationPrincipalType.USER }],
			boundaries: [],
		};
		const source = {
			getAttachments: vi.fn(async () => resolvedAttachments),
		};
		const resolver = new ApiAuthorizationIamAttachmentResolver(cache, [source]);

		await expect(resolver.resolve(principal)).resolves.toEqual(resolvedAttachments);
		await expect(resolver.resolve(principal)).resolves.toEqual(resolvedAttachments);

		expect(source.getAttachments).toHaveBeenCalledOnce();
		expect(cache.get(principal)).toEqual(resolvedAttachments);
	});
});
