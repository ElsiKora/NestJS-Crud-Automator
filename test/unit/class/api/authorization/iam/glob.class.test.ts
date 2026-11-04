import type { IApiAuthorizationIamResourceSegment } from "@interface/class/api/authorization";

import { ApiAuthorizationIamGlob } from "@class/api/authorization/iam";
import { describe, expect, it } from "vitest";

const itemSegments: Array<IApiAuthorizationIamResourceSegment> = [{ value: "ns:item/" }, { placeholder: "id", value: "*" }];
const tenantSegments: Array<IApiAuthorizationIamResourceSegment> = [{ value: "ns:tenant/" }, { placeholder: "tenantId", value: "*" }, { value: "/item/" }, { placeholder: "id", value: "*" }];

describe("ApiAuthorizationIamGlob", () => {
	describe("isMatched", () => {
		it.each([
			["*", ""],
			["*", "ns:item:delete"],
			["ns:item:read", "ns:item:read"],
			["ns:item:*", "ns:item:read"],
			["ns:*:delete", "ns:item:delete"],
			["ns:*:delete", "ns::delete"],
			["ns:*:delete", "ns:a:b:delete"],
			["ns:item/*/secret", "ns:item/1/secret"],
			["ns:item/*/secret", "ns:item/a/b/secret"],
			["ns:*-history", "ns:item-history"],
			["*-history", "-history"],
			["a*b*c", "abc"],
			["a*b*c", "axxbyyc"],
			["**", "x"],
			["ns:item/?", "ns:item/?"],
			["ns:item/?", "ns:item/1"],
			["ns:item/?", "ns:item/🙂"],
			["ns:?:read", "ns:a:read"],
			["ns:item/${?}", "ns:item/?"],
			["ns:item/${*}", "ns:item/*"],
			["ns:${$}item", "ns:$item"],
			["ns:ключ/*/ü", "ns:ключ/🙂/ü"],
		])("matches %s against %s", (pattern: string, value: string) => {
			expect(ApiAuthorizationIamGlob.isMatched(pattern, value)).toBe(true);
		});

		it.each([
			["ns:item:read", "ns:item:reads"],
			["ns:*:delete", "ns:item:read"],
			["ns:*:delete", "ns:item:deletes"],
			["ns:item/*/secret", "ns:item/secret"],
			["ns:*-history", "ns:item-history/1"],
			["a*b*c", "acb"],
			["ns:item/?", "ns:item/12"],
			["ns:item/?", "ns:item/"],
			["ns:item/${?}", "ns:item/1"],
			["ns:item/${*}", "ns:item/1"],
			["ns:item/*", "ns:other/1"],
			["x", ""],
		])("does not match %s against %s", (pattern: string, value: string) => {
			expect(ApiAuthorizationIamGlob.isMatched(pattern, value)).toBe(false);
		});

		it("refuses a pattern with a variable or a malformed ${...}", () => {
			expect(() => ApiAuthorizationIamGlob.isMatched("ns:item/${principal.id}", "ns:item/1")).toThrow();
			expect(() => ApiAuthorizationIamGlob.isMatched("ns:item/${", "ns:item/1")).toThrow();
		});

		it("matches a hostile pattern in bounded time", () => {
			const pattern: string = `${"*a".repeat(200)}b`;
			const value: string = "a".repeat(5000);
			const startedAt: number = performance.now();

			expect(ApiAuthorizationIamGlob.isMatched(pattern, value)).toBe(false);
			expect(performance.now() - startedAt).toBeLessThan(2000);
		});
	});

	describe("isCovering", () => {
		it.each([
			["*", itemSegments],
			["ns:item/*", itemSegments],
			["ns:*", itemSegments],
			["ns:tenant/*/item/*", tenantSegments],
			["ns:tenant/*", tenantSegments],
			["ns:item/1", [{ value: "ns:item/1" }]],
			["ns:item/?", [{ value: "ns:item/1" }]],
		])("covers every row of the collection with %s", (pattern: string, segments: Array<IApiAuthorizationIamResourceSegment>) => {
			expect(ApiAuthorizationIamGlob.isCovering(pattern, segments)).toBe(true);
		});

		it.each([
			["ns:item/?", itemSegments],
			["ns:item/${*}", itemSegments],
			["ns:item/1", itemSegments],
			["ns:item/1*", itemSegments],
			["ns:tenant/t-1/item/*", tenantSegments],
			["ns:item/2", [{ value: "ns:item/1" }]],
		])("does not cover every row of the collection with %s", (pattern: string, segments: Array<IApiAuthorizationIamResourceSegment>) => {
			expect(ApiAuthorizationIamGlob.isCovering(pattern, segments)).toBe(false);
		});
	});

	describe("readLiteralPrefix", () => {
		it.each([
			["ns:item/1", { isPrefix: false, value: "ns:item/1" }],
			["ns:item/*", { isPrefix: true, value: "ns:item/" }],
			["ns:item/${*}", { isPrefix: false, value: "ns:item/*" }],
			["ns:item/${?}*", { isPrefix: true, value: "ns:item/?" }],
			["ns:*/1", undefined],
			["ns:item/?", undefined],
			["ns:item/**", undefined],
		])("reads %s", (pattern: string, expected: undefined | { isPrefix: boolean; value: string }) => {
			expect(ApiAuthorizationIamGlob.readLiteralPrefix(ApiAuthorizationIamGlob.readTokens(pattern))).toEqual(expected);
		});
	});

	describe("isOverlapping", () => {
		it.each([
			["ns:item/*-secret", itemSegments],
			["ns:*/1", itemSegments],
			["*", itemSegments],
			["ns:item/*", itemSegments],
			["ns:tenant/t-1*item-1", tenantSegments],
			["ns:tenant/*/item/*/x", tenantSegments],
			["ns:tenant/*/note/*", tenantSegments],
			["ns:item/?", itemSegments],
			["ns:item/${*}", itemSegments],
			["ns:?tem/*", itemSegments],
		])("finds a row of the collection for %s", (pattern: string, segments: Array<IApiAuthorizationIamResourceSegment>) => {
			expect(ApiAuthorizationIamGlob.isOverlapping(pattern, segments)).toBe(true);
		});

		it.each([
			["ns:other/*", itemSegments],
			["ns:items*", itemSegments],
			["other:*/1", itemSegments],
			["ns:tenants*/item/*", tenantSegments],
			["ns:item/x*", [{ value: "ns:item/abc" }]],
			["ns:?tem/*", [{ value: "ns:tem/1" }]],
			["ns:item/??", [{ value: "ns:item/1" }]],
		])("finds no row of the collection for %s", (pattern: string, segments: Array<IApiAuthorizationIamResourceSegment>) => {
			expect(ApiAuthorizationIamGlob.isOverlapping(pattern, segments)).toBe(false);
		});
	});
});
