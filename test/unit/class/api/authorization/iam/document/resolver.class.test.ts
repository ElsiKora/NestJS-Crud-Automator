import { ApiAuthorizationIamDocumentCache, ApiAuthorizationIamDocumentResolver, ApiAuthorizationIamDocumentValidator } from "@class/api/authorization/iam";
import { EApiPolicySourceType } from "@enum/class/authorization";
import { describe, expect, it, vi } from "vitest";

describe("ApiAuthorizationIamDocumentResolver", () => {
	it("uses IAM document cache hits without calling sources", async () => {
		const cache = new ApiAuthorizationIamDocumentCache();
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
