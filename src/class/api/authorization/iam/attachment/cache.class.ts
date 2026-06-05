import type { IApiAuthorizationPrincipal, IApiResolvedPolicyAttachments } from "@interface/class/api/authorization";

import { Injectable } from "@nestjs/common";

@Injectable()
export class ApiAuthorizationIamAttachmentCache {
	private readonly CACHE: Map<string, IApiResolvedPolicyAttachments> = new Map<string, IApiResolvedPolicyAttachments>();

	public clear(): void {
		this.CACHE.clear();
	}

	public get(principal: IApiAuthorizationPrincipal): IApiResolvedPolicyAttachments | undefined {
		return this.CACHE.get(this.createPrincipalCacheKey(principal));
	}

	public set(principal: IApiAuthorizationPrincipal, attachments: IApiResolvedPolicyAttachments): void {
		this.CACHE.set(this.createPrincipalCacheKey(principal), attachments);
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
		const sortedKeys: Array<string> = Object.keys(recordValue).toSorted((left: string, right: string) => left.localeCompare(right));

		for (const key of sortedKeys) {
			normalizedValue[key] = this.normalizeValue(recordValue[key]);
		}

		return normalizedValue;
	}
}
