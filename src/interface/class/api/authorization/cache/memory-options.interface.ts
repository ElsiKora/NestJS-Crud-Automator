import type { EApiAuthorizationCacheMode } from "@enum/class/authorization";

export interface IApiAuthorizationCacheMemoryOptions {
	maxEntries: number;
	mode: EApiAuthorizationCacheMode.MEMORY;
	ttlMs: number;
}
