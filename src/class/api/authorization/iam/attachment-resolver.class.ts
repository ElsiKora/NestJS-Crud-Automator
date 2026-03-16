import type { IApiAuthorizationPrincipal, IApiPolicyAttachment, IApiPolicyAttachmentSource, IApiResolvedPolicyAttachments } from "@interface/class/api/authorization";

import { AUTHORIZATION_POLICY_ATTACHMENT_SOURCES_TOKEN } from "@constant/class/authorization";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { LoggerUtility } from "@utility/logger.utility";

const iamAttachmentResolverLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationIamAttachmentResolver");

@Injectable()
export class ApiAuthorizationIamAttachmentResolver {
	private readonly CACHE: Map<string, IApiResolvedPolicyAttachments> = new Map<string, IApiResolvedPolicyAttachments>();

	public constructor(
		@Optional()
		@Inject(AUTHORIZATION_POLICY_ATTACHMENT_SOURCES_TOKEN)
		private readonly sources: ReadonlyArray<IApiPolicyAttachmentSource> = [],
	) {}

	public clear(): void {
		this.CACHE.clear();
	}

	public async resolve(principal: IApiAuthorizationPrincipal): Promise<IApiResolvedPolicyAttachments> {
		const cacheKey: string = this.createPrincipalCacheKey(principal);
		const cachedAttachments: IApiResolvedPolicyAttachments | undefined = this.CACHE.get(cacheKey);

		if (cachedAttachments) {
			iamAttachmentResolverLogger.verbose(`Using cached IAM attachments for principal "${principal.id}" (${cachedAttachments.attachments.length} attachments, ${cachedAttachments.boundaries.length} boundaries).`);

			return cachedAttachments;
		}

		const attachments: Map<string, IApiPolicyAttachment> = new Map<string, IApiPolicyAttachment>();
		const boundaries: Map<string, IApiPolicyAttachment> = new Map<string, IApiPolicyAttachment>();

		for (const source of this.sources) {
			const resolvedAttachments: IApiResolvedPolicyAttachments = await source.getAttachments(principal);

			for (const attachment of resolvedAttachments.attachments) {
				attachments.set(this.createAttachmentKey(attachment), attachment);
			}

			for (const boundary of resolvedAttachments.boundaries) {
				boundaries.set(this.createAttachmentKey(boundary), boundary);
			}
		}

		const result: IApiResolvedPolicyAttachments = {
			attachments: [...attachments.values()],
			boundaries: [...boundaries.values()],
		};

		this.CACHE.set(cacheKey, result);
		iamAttachmentResolverLogger.verbose(`Resolved ${result.attachments.length} IAM attachments and ${result.boundaries.length} boundaries for principal "${principal.id}" from ${this.sources.length} sources.`);

		return result;
	}

	private createAttachmentKey(attachment: IApiPolicyAttachment): string {
		return JSON.stringify({
			metadata: this.normalizeValue(attachment.metadata ?? {}),
			policyId: attachment.policyId,
			principalId: attachment.principalId,
			principalType: attachment.principalType,
		});
	}

	private createPrincipalCacheKey(principal: IApiAuthorizationPrincipal): string {
		return JSON.stringify(this.normalizeValue(principal));
	}

	private normalizeValue(value: unknown): unknown {
		if (Array.isArray(value)) {
			return value.map((item: unknown) => this.normalizeValue(item));
		}

		if (!value || typeof value !== "object") {
			return value;
		}

		const normalizedValue: Record<string, unknown> = {};
		const recordValue: Record<string, unknown> = value as Record<string, unknown>;
		const sortedKeys: Array<string> = Object.keys(recordValue).sort((left: string, right: string) => left.localeCompare(right));

		for (const key of sortedKeys) {
			normalizedValue[key] = this.normalizeValue(recordValue[key]);
		}

		return normalizedValue;
	}
}
