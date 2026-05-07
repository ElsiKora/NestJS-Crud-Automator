import { ApiAuthorizationIamDocumentCache } from "@class/api/authorization/iam";
import { describe, expect, it } from "vitest";

describe("ApiAuthorizationIamDocumentCache", () => {
	it("normalizes document ids", () => {
		const cache = new ApiAuthorizationIamDocumentCache();
		const documents = [{ document: { Statement: [] }, id: "policy-a" }];

		cache.set(["policy-b", "policy-a", "policy-a"], documents as never);

		expect(cache.normalizeIds(["policy-b", "", "policy-a", "policy-a"])).toEqual(["policy-a", "policy-b"]);
		expect(cache.get(["policy-a", "policy-b"])).toBe(documents);
	});
});
