import { ApiAuthorizationIamAttachmentCache, ApiAuthorizationIamAttachmentResolver } from "@class/api/authorization/iam";
import { EApiAuthorizationPrincipalType } from "@enum/class/authorization";
import { describe, expect, it, vi } from "vitest";

describe("ApiAuthorizationIamAttachmentResolver", () => {
	it("stores resolved IAM attachments in the attachment cache", async () => {
		const cache = new ApiAuthorizationIamAttachmentCache();
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
