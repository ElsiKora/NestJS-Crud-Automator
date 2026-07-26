import { ApiAuthorizationIamDocumentCache, ApiAuthorizationIamDocumentResolver, ApiAuthorizationIamDocumentValidator } from "@class/api/authorization/iam";
import { EApiAuthorizationCacheMode, EApiPolicySourceType } from "@enum/class/authorization";
import { describe, expect, it, vi } from "vitest";

describe("ApiAuthorizationIamDocumentResolver", () => {
	it("reads IAM documents independently and fails closed without a stale fallback", async () => {
		const cache = new ApiAuthorizationIamDocumentCache();
		const initialDocuments = [
			{
				document: {
					Statement: [],
					Version: "2012-10-17",
				},
				id: "policy-a",
				namespace: "default",
				sourceType: EApiPolicySourceType.MANAGED,
				version: "1",
			},
		];
		const updatedDocuments = [
			{
				...initialDocuments[0],
				version: "2",
			},
		];
		const sourceError = new Error("document source unavailable");
		const source = {
			getDocumentsByIds: vi.fn().mockResolvedValueOnce(initialDocuments).mockResolvedValueOnce(updatedDocuments).mockRejectedValueOnce(sourceError),
		};
		const resolver = new ApiAuthorizationIamDocumentResolver(cache, new ApiAuthorizationIamDocumentValidator(), [source]);

		await expect(resolver.resolve(["policy-a", "policy-a"])).resolves.toEqual(initialDocuments);
		await expect(resolver.resolve(["policy-a"])).resolves.toEqual(updatedDocuments);
		await expect(resolver.resolve(["policy-a"])).rejects.toBe(sourceError);

		expect(source.getDocumentsByIds).toHaveBeenNthCalledWith(1, ["policy-a"]);
		expect(source.getDocumentsByIds).toHaveBeenCalledTimes(3);
		expect(cache.get(["policy-a"])).toBeUndefined();
	});

	it("uses IAM document cache hits without calling sources", async () => {
		const cache = new ApiAuthorizationIamDocumentCache();
		cache.configure({
			maxEntries: 10,
			mode: EApiAuthorizationCacheMode.MEMORY,
			ttlMs: 60_000,
		});
		const documents = [
			{
				document: {
					Statement: [],
					Version: "2012-10-17",
				},
				id: "policy-a",
				namespace: "default",
				sourceType: EApiPolicySourceType.MANAGED,
				version: "1",
			},
		];
		const source = {
			getDocumentsByIds: vi.fn(async () => documents),
		};
		const resolver = new ApiAuthorizationIamDocumentResolver(cache, new ApiAuthorizationIamDocumentValidator(), [source]);

		cache.set(["policy-a"], documents);

		await expect(resolver.resolve(["policy-a"])).resolves.toBe(documents);
		expect(source.getDocumentsByIds).not.toHaveBeenCalled();
	});
});
