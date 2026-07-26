import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization";
import type { TApiAuthorizationCacheOptions } from "@type/class/api/authorization";

import { ApiAuthorizationResolverCache } from "@class/api/authorization/resolver";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ApiAuthorizationHookPermissionCache {
	private readonly CACHE: ApiAuthorizationResolverCache<ReadonlyArray<string>> = new ApiAuthorizationResolverCache<ReadonlyArray<string>>();

	public clear(): void {
		this.CACHE.clear();
	}

	public configure(options?: TApiAuthorizationCacheOptions): void {
		this.CACHE.configure(options);
	}

	public get(principal: IApiAuthorizationPrincipal): ReadonlyArray<string> | undefined {
		return this.CACHE.get(this.createPrincipalCacheKey(principal));
	}

	public set(principal: IApiAuthorizationPrincipal, permissions: ReadonlyArray<string>): void {
		this.CACHE.set(this.createPrincipalCacheKey(principal), permissions);
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
