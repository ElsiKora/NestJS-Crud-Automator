import type { IApiAuthorizationCacheMemoryOptions } from "@interface/class/api/authorization";

import { ApiAuthorizationResolverCache } from "@class/api/authorization/resolver";
import { EApiAuthorizationCacheMode } from "@enum/class/authorization";
import { describe, expect, it, vi } from "vitest";

describe("ApiAuthorizationResolverCache", () => {
	it("does not populate principal, document, or negative entries in source-first mode", () => {
		const cache = new ApiAuthorizationResolverCache<ReadonlyArray<string>>({
			mode: EApiAuthorizationCacheMode.SOURCE_FIRST,
		});

		for (let index = 0; index < 100; index += 1) {
			cache.set(`principal-or-document-${index}`, []);
		}

		const entries = Reflect.get(cache, "CACHE") as Map<string, unknown>;

		expect(entries.size).toBe(0);
		expect(cache.get("principal-or-document-0")).toBeUndefined();
	});

	it("bounds MEMORY entries and expires them after the configured TTL", () => {
		vi.useFakeTimers();

		try {
			vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

			const cache = new ApiAuthorizationResolverCache<string>({
				maxEntries: 2,
				mode: EApiAuthorizationCacheMode.MEMORY,
				ttlMs: 100,
			});

			cache.set("first", "first-value");
			cache.set("second", "second-value");
			cache.set("third", "third-value");

			expect(cache.get("first")).toBeUndefined();
			expect(cache.get("second")).toBe("second-value");
			expect(cache.get("third")).toBe("third-value");

			vi.advanceTimersByTime(100);

			expect(cache.get("second")).toBeUndefined();
			expect(cache.get("third")).toBeUndefined();
		} finally {
			vi.useRealTimers();
		}
	});

	it("copies MEMORY bounds so later configuration mutation cannot disable them", () => {
		vi.useFakeTimers();

		try {
			vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

			const options: IApiAuthorizationCacheMemoryOptions = {
				maxEntries: 1,
				mode: EApiAuthorizationCacheMode.MEMORY,
				ttlMs: 100,
			};
			const cache = new ApiAuthorizationResolverCache<string>(options);

			options.maxEntries = 100;
			options.ttlMs = 100_000;

			cache.set("first", "first-value");
			cache.set("second", "second-value");

			expect(cache.get("first")).toBeUndefined();
			expect(cache.get("second")).toBe("second-value");

			vi.advanceTimersByTime(100);

			expect(cache.get("second")).toBeUndefined();
		} finally {
			vi.useRealTimers();
		}
	});

	it("rejects invalid MEMORY bounds and unknown modes at the cache boundary", () => {
		expect(
			() =>
				new ApiAuthorizationResolverCache({
					maxEntries: 0,
					mode: EApiAuthorizationCacheMode.MEMORY,
					ttlMs: 100,
				}),
		).toThrow("maxEntries must be a positive safe integer");
		expect(
			() =>
				new ApiAuthorizationResolverCache({
					maxEntries: 1,
					mode: EApiAuthorizationCacheMode.MEMORY,
					ttlMs: 0,
				}),
		).toThrow("ttlMs must be a positive safe integer");
		expect(
			() =>
				new ApiAuthorizationResolverCache({
					mode: "distributed",
				} as never),
		).toThrow('Unknown authorization cache mode "distributed"');
	});
});
