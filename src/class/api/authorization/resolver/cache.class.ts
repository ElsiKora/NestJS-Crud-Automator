import type { IApiAuthorizationCacheMemoryOptions } from "@interface/class/api/authorization/cache";
import type { TApiAuthorizationCacheOptions } from "@type/class/api/authorization";

import { EApiAuthorizationCacheMode } from "@enum/class/authorization";
import { ErrorException } from "@utility/error/exception.utility";
import { FormatUnknownForLog } from "@utility/format-unknown-for-log.utility";

export class ApiAuthorizationResolverCache<V> {
	private readonly CACHE: Map<string, { cachedAt: number; value: V }> = new Map<string, { cachedAt: number; value: V }>();

	private options?: TApiAuthorizationCacheOptions;

	public constructor(options?: TApiAuthorizationCacheOptions) {
		this.configure(options);
	}

	public clear(): void {
		this.CACHE.clear();
	}

	public configure(options?: TApiAuthorizationCacheOptions): void {
		this.clear();
		const mode: unknown = options?.mode;

		if (mode === undefined || mode === EApiAuthorizationCacheMode.SOURCE_FIRST) {
			this.options = undefined;

			return;
		}

		if (mode !== EApiAuthorizationCacheMode.MEMORY) {
			throw ErrorException(`Unknown authorization cache mode "${FormatUnknownForLog(mode)}"`);
		}

		const memoryOptions: IApiAuthorizationCacheMemoryOptions = options as IApiAuthorizationCacheMemoryOptions;

		if (!Number.isSafeInteger(memoryOptions.maxEntries) || memoryOptions.maxEntries <= 0) {
			throw ErrorException("Authorization MEMORY cache maxEntries must be a positive safe integer");
		}

		if (!Number.isSafeInteger(memoryOptions.ttlMs) || memoryOptions.ttlMs <= 0) {
			throw ErrorException("Authorization MEMORY cache ttlMs must be a positive safe integer");
		}

		this.options = {
			maxEntries: memoryOptions.maxEntries,
			mode: EApiAuthorizationCacheMode.MEMORY,
			ttlMs: memoryOptions.ttlMs,
		};
	}

	public get(key: string): undefined | V {
		const options: IApiAuthorizationCacheMemoryOptions | undefined = this.getMemoryOptions();

		if (!options) {
			return undefined;
		}

		const entry: { cachedAt: number; value: V } | undefined = this.CACHE.get(key);

		if (!entry) {
			return undefined;
		}

		if (Date.now() - entry.cachedAt >= options.ttlMs) {
			this.CACHE.delete(key);

			return undefined;
		}

		return entry.value;
	}

	public set(key: string, value: V): void {
		const options: IApiAuthorizationCacheMemoryOptions | undefined = this.getMemoryOptions();

		if (!options) {
			return;
		}

		for (const [cachedKey, entry] of this.CACHE.entries()) {
			if (Date.now() - entry.cachedAt >= options.ttlMs) {
				this.CACHE.delete(cachedKey);
			}
		}

		this.CACHE.delete(key);

		while (this.CACHE.size >= options.maxEntries) {
			const oldestKey: string | undefined = this.CACHE.keys().next().value;

			if (oldestKey === undefined) {
				break;
			}

			this.CACHE.delete(oldestKey);
		}

		this.CACHE.set(key, { cachedAt: Date.now(), value });
	}

	private getMemoryOptions(): IApiAuthorizationCacheMemoryOptions | undefined {
		return this.options?.mode === EApiAuthorizationCacheMode.MEMORY ? this.options : undefined;
	}
}
