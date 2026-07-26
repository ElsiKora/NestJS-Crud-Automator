import { ApiAuthorizationIamAttachmentCache } from "@class/api/authorization/iam";
import { EApiAuthorizationCacheMode, EApiAuthorizationPrincipalType } from "@enum/class/authorization";
import { describe, expect, it } from "vitest";

describe("ApiAuthorizationIamAttachmentCache", () => {
	it("uses stable principal keys", () => {
		const cache = new ApiAuthorizationIamAttachmentCache();
		cache.configure({
			maxEntries: 10,
			mode: EApiAuthorizationCacheMode.MEMORY,
			ttlMs: 60_000,
		});
		const attachments = {
			attachments: [{ policyId: "policy-a", principalId: "user-1", principalType: EApiAuthorizationPrincipalType.USER }],
			boundaries: [],
		};

		cache.set({ attributes: { b: 2, a: 1 }, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER }, attachments);

		expect(cache.get({ attributes: { a: 1, b: 2 }, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER })).toBe(attachments);
	});
});
