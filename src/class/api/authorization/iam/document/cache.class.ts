import type { IApiPolicyDocumentRecord } from "@interface/class/api/authorization";

import { Injectable } from "@nestjs/common";

@Injectable()
export class ApiAuthorizationIamDocumentCache {
	private readonly CACHE: Map<string, ReadonlyArray<IApiPolicyDocumentRecord>> = new Map<string, ReadonlyArray<IApiPolicyDocumentRecord>>();

	public clear(): void {
		this.CACHE.clear();
	}

	public get(ids: ReadonlyArray<string>): ReadonlyArray<IApiPolicyDocumentRecord> | undefined {
		const normalizedIds: Array<string> = this.normalizeIds(ids);

		if (normalizedIds.length === 0) {
			return undefined;
		}

		return this.CACHE.get(this.createDocumentCacheKey(normalizedIds));
	}

	public normalizeIds(ids: ReadonlyArray<string>): Array<string> {
		return [...new Set(ids.filter((id: string) => typeof id === "string" && id.length > 0))].toSorted((left: string, right: string) => left.localeCompare(right));
	}

	public set(ids: ReadonlyArray<string>, documents: ReadonlyArray<IApiPolicyDocumentRecord>): void {
		const normalizedIds: Array<string> = this.normalizeIds(ids);

		if (normalizedIds.length === 0) {
			return;
		}

		this.CACHE.set(this.createDocumentCacheKey(normalizedIds), documents);
	}

	private createDocumentCacheKey(normalizedIds: ReadonlyArray<string>): string {
		return normalizedIds.join("::");
	}
}
