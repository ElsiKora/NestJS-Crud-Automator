import type { IApiAuthorizationIamResourceClassification, IApiAuthorizationIamResourceConstraint, IApiAuthorizationIamResourceSegment, IApiAuthorizationIamToken } from "@interface/class/api/authorization";

import { ApiAuthorizationIamGlob, ApiAuthorizationIamResourcePattern } from "@class/api/authorization/iam";
import { EApiAuthorizationIamResourceClass, EApiAuthorizationIamTokenType } from "@enum/class/authorization";
import { describe, expect, it } from "vitest";

const ITEM: Array<IApiAuthorizationIamResourceSegment> = [{ value: "ns:item/" }, { placeholder: "id", value: "*" }];
const TENANT: Array<IApiAuthorizationIamResourceSegment> = [{ value: "ns:tenant/" }, { placeholder: "tenantId", value: "*" }, { value: "/item/" }, { placeholder: "id", value: "*" }];
const CANONICAL_ALPHABET: RegExp = /^[\da-f-]$/;

// What a slot renders for a value: a NULL value renders as "".
const readPattern = (constraint: IApiAuthorizationIamResourceConstraint): string =>
	constraint.pattern
		.map((token: IApiAuthorizationIamToken): string => {
			if (token.type === EApiAuthorizationIamTokenType.STAR) {
				return "*";
			}

			return token.type === EApiAuthorizationIamTokenType.QUESTION_MARK ? "?" : (token.value ?? "");
		})
		.join("");

const classify = (pattern: string, segments: ReadonlyArray<IApiAuthorizationIamResourceSegment>, alphabets?: ReadonlyMap<string, RegExp>): IApiAuthorizationIamResourceClassification => ApiAuthorizationIamResourcePattern.classify(ApiAuthorizationIamGlob.readTokens(pattern), segments, alphabets);

const readConstraints = (classification: IApiAuthorizationIamResourceClassification): Record<string, string> => Object.fromEntries(classification.constraints.map((constraint: IApiAuthorizationIamResourceConstraint): [string, string] => [constraint.placeholder, readPattern(constraint)]));

/**
 * A seeded generator, so a failing case can be replayed from its seed.
 * @param {number} seed - Seed.
 * @returns {() => number} A function that returns numbers in [0, 1).
 */
function createRandom(seed: number): () => number {
	let state: number = seed;

	return (): number => {
		state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;

		return state / 4_294_967_296;
	};
}

/**
 * Renders the resource string of a row.
 * @param {ReadonlyArray<IApiAuthorizationIamResourceSegment>} segments - Template.
 * @param {Record<string, string>} values - Value of each placeholder.
 * @returns {string} The rendered text.
 */
function render(segments: ReadonlyArray<IApiAuthorizationIamResourceSegment>, values: Record<string, string>): string {
	return segments.map((segment: IApiAuthorizationIamResourceSegment): string => (segment.placeholder === undefined ? segment.value : (values[segment.placeholder] ?? ""))).join("");
}

describe("ApiAuthorizationIamResourcePattern", () => {
	describe("classify", () => {
		it.each([
			["*", ITEM],
			["ns:*", ITEM],
			["ns:item/*", ITEM],
			["ns:*:item/*", [{ value: "ns:x:item/" }, { placeholder: "id", value: "*" }]],
			["ns:tenant/*", TENANT],
			["ns:tenant/*/item/*", TENANT],
			["*/*", ITEM],
			["ns:item/1", [{ value: "ns:item/1" }]],
			["ns:item/?", [{ value: "ns:item/1" }]],
		])("classifies %s as covering every row", (pattern: string, segments: Array<IApiAuthorizationIamResourceSegment>) => {
			expect(classify(pattern, segments)).toEqual({ constraints: [], kind: EApiAuthorizationIamResourceClass.ALL });
		});

		it.each([
			["ns:other/*", ITEM],
			["ns:items*", ITEM],
			["ns:item", ITEM],
			["ns:tenants*/item/*", TENANT],
			["ns:other/*/item/*", TENANT],
			["ns:item/2", [{ value: "ns:item/1" }]],
			["ns:item/??", [{ value: "ns:item/1" }]],
		])("classifies %s as matching no row", (pattern: string, segments: Array<IApiAuthorizationIamResourceSegment>) => {
			expect(classify(pattern, segments)).toEqual({ constraints: [], kind: EApiAuthorizationIamResourceClass.NONE });
		});

		it.each([
			["an exact value", "ns:item/abc", ITEM, { id: "abc" }],
			["a prefix", "ns:item/abc*", ITEM, { id: "abc*" }],
			["a suffix", "ns:item/*abc", ITEM, { id: "*abc" }],
			["an interior wildcard", "ns:item/a*c", ITEM, { id: "a*c" }],
			["one character", "ns:item/item-?", ITEM, { id: "item-?" }],
			["an empty slot, which a NULL renders as", "ns:item/", ITEM, { id: "" }],
			["an escaped wildcard, which is a literal", "ns:item/${*}", ITEM, { id: "*" }],
			["a wildcard over the literal before the slot", "ns:*/abc", ITEM, undefined],
			["both slots exactly", "ns:tenant/t-1/item/item-1", TENANT, { id: "item-1", tenantId: "t-1" }],
			["a prefix that ends in the first slot", "ns:tenant/t-1*", TENANT, { tenantId: "t-1*" }],
			["a wildcard across the separator", "ns:tenant/t-1*item-1", TENANT, { id: "*item-1", tenantId: "t-1*" }],
			["a wildcard the first slot alone can absorb the rest of the path into", "ns:tenant/t-1/note/*", TENANT, { tenantId: "t-1/note/*" }],
			["the empty first slot", "ns:tenant//item/item-1", TENANT, { id: "item-1", tenantId: "" }],
			["the empty last slot", "ns:tenant/t-1/item/", TENANT, { id: "", tenantId: "t-1" }],
		])("decomposes %s", (_name: string, pattern: string, segments: Array<IApiAuthorizationIamResourceSegment>, expected: Record<string, string> | undefined) => {
			const classification: IApiAuthorizationIamResourceClassification = classify(pattern, segments);

			if (expected) {
				expect(classification.kind).toBe(EApiAuthorizationIamResourceClass.PARTIAL);
				expect(readConstraints(classification)).toEqual(expected);
			} else {
				expect(classification.kind).toBe(EApiAuthorizationIamResourceClass.AMBIGUOUS);
			}
		});

		it.each([
			// t = "t-1" with id = "item/b", or t = "t-1/item" with id = "b".
			["a separator the literal holds twice", "ns:tenant/t-1/item/a/item/b"],
			// The separator may lie in the literal or under the star.
			["a prefix past the separator", "ns:tenant/t-1/it*"],
			["a prefix past the whole separator", "ns:tenant/t-1/item/a*"],
			// The literal may lie in either slot.
			["a wildcard in a text slot before the separator", "ns:tenant/*/item/item-1"],
			["a wildcard in a text slot with a suffix", "ns:tenant/t-1/item/*-secret"],
		])("refuses %s on text slots as ambiguous", (_name: string, pattern: string) => {
			expect(classify(pattern, TENANT)).toEqual({ constraints: [], kind: EApiAuthorizationIamResourceClass.AMBIGUOUS });
		});

		it("refuses a text last slot that could hold the separator, whatever the first slot holds", () => {
			// With id = "x/item/a", "ns:tenant/T/item/x/item/a" matches this pattern, though the id does not start with "a".
			expect(classify("ns:tenant/*/item/a*", TENANT, new Map([["tenantId", CANONICAL_ALPHABET]])).kind).toBe(EApiAuthorizationIamResourceClass.AMBIGUOUS);
		});

		it("decomposes a wildcard on a slot whose alphabet cannot hold the separator", () => {
			const alphabets: ReadonlyMap<string, RegExp> = new Map([
				["id", CANONICAL_ALPHABET],
				["tenantId", CANONICAL_ALPHABET],
			]);

			expect(readConstraints(classify("ns:tenant/*/item/abc", TENANT, alphabets))).toEqual({ id: "abc" });
			expect(readConstraints(classify("ns:tenant/*/item/a*", TENANT, alphabets))).toEqual({ id: "a*" });
			expect(readConstraints(classify("ns:tenant/abc/item/*", TENANT, alphabets))).toEqual({ tenantId: "abc" });
			expect(classify("ns:tenant/*/item/*", TENANT, alphabets).kind).toBe(EApiAuthorizationIamResourceClass.ALL);
		});

		it("drops an alignment a slot's alphabet cannot hold, and finds no row when none is left", () => {
			expect(classify("ns:item/ABC", ITEM, new Map([["id", CANONICAL_ALPHABET]])).kind).toBe(EApiAuthorizationIamResourceClass.NONE);
			expect(classify("ns:item/x/y", ITEM, new Map([["id", CANONICAL_ALPHABET]])).kind).toBe(EApiAuthorizationIamResourceClass.NONE);
		});

		it("reads two placeholders with no literal between them as ambiguous unless a wildcard covers both", () => {
			const adjacent: Array<IApiAuthorizationIamResourceSegment> = [
				{ placeholder: "a", value: "*" },
				{ placeholder: "b", value: "*" },
			];

			expect(classify("xy", adjacent).kind).toBe(EApiAuthorizationIamResourceClass.AMBIGUOUS);
			expect(classify("*", adjacent).kind).toBe(EApiAuthorizationIamResourceClass.ALL);
		});

		it("gives one placeholder written twice a constraint per slot", () => {
			const twice: Array<IApiAuthorizationIamResourceSegment> = [{ placeholder: "id", value: "*" }, { value: "/" }, { placeholder: "id", value: "*" }];

			expect(classify("a/b", twice).constraints.map(readPattern)).toEqual(["a", "b"]);
		});

		it("refuses a variable, which must be resolved first", () => {
			expect(() => ApiAuthorizationIamResourcePattern.classify([{ type: EApiAuthorizationIamTokenType.VARIABLE, variable: { path: "principal.id" } }], ITEM)).toThrow("must be resolved");
		});

		it("classifies a hostile pattern in bounded time", () => {
			const pattern: string = `ns:tenant/${"*a".repeat(60)}/item/${"*a".repeat(60)}b`;
			const startedAt: number = performance.now();

			expect(classify(pattern, TENANT).kind).not.toBe(EApiAuthorizationIamResourceClass.ALL);
			expect(performance.now() - startedAt).toBeLessThan(2000);
		});
	});

	describe("agrees with the glob on every row", () => {
		const TEMPLATES: Array<Array<IApiAuthorizationIamResourceSegment>> = [
			[{ value: "a/" }, { placeholder: "x", value: "*" }],
			[{ placeholder: "x", value: "*" }, { value: "/b" }],
			[{ value: "a/" }, { placeholder: "x", value: "*" }, { value: "/" }, { placeholder: "y", value: "*" }],
			[{ value: "a" }, { placeholder: "x", value: "*" }, { value: "ab" }, { placeholder: "y", value: "*" }, { value: "b" }],
			[
				{ placeholder: "x", value: "*" },
				{ placeholder: "y", value: "*" },
			],
		];
		const VALUES: Array<string> = ["", "a", "b", "/", "ab", "ba", "a/", "/a", "aa", "a/b", "ab/", "b/a", "aba", "/b", "bb"];
		const SYMBOLS: Array<string> = ["a", "b", "/", "*", "?"];

		const readRows = (segments: ReadonlyArray<IApiAuthorizationIamResourceSegment>): Array<Record<string, string>> => {
			const placeholders: Array<string> = [...new Set(segments.flatMap((segment: IApiAuthorizationIamResourceSegment): Array<string> => (segment.placeholder === undefined ? [] : [segment.placeholder])))];

			return placeholders.reduce<Array<Record<string, string>>>((rows: Array<Record<string, string>>, placeholder: string): Array<Record<string, string>> => rows.flatMap((row: Record<string, string>): Array<Record<string, string>> => VALUES.map((value: string): Record<string, string> => ({ ...row, [placeholder]: value }))), [{}]);
		};

		it("says exactly what the glob says about each row, for random patterns", () => {
			const random: () => number = createRandom(20_261_104);
			const counts: Record<string, number> = {};
			const mismatches: Array<unknown> = [];

			for (let index: number = 0; index < 1500; index++) {
				const segments: Array<IApiAuthorizationIamResourceSegment> = TEMPLATES[Math.floor(random() * TEMPLATES.length)] ?? [];
				const pattern: string = Array.from({ length: Math.floor(random() * 7) + 1 }, (): string => SYMBOLS[Math.floor(random() * SYMBOLS.length)] ?? "*").join("");
				const tokens: Array<IApiAuthorizationIamToken> = ApiAuthorizationIamGlob.readTokens(pattern);
				const classification: IApiAuthorizationIamResourceClassification = ApiAuthorizationIamResourcePattern.classify(tokens, segments);

				counts[classification.kind] = (counts[classification.kind] ?? 0) + 1;

				if (classification.kind === EApiAuthorizationIamResourceClass.AMBIGUOUS) {
					continue;
				}

				for (const row of readRows(segments)) {
					const isMatched: boolean = ApiAuthorizationIamGlob.isMatched(tokens, render(segments, row));
					const isClassified: boolean = classification.kind === EApiAuthorizationIamResourceClass.ALL || (classification.kind === EApiAuthorizationIamResourceClass.PARTIAL && classification.constraints.every((constraint: IApiAuthorizationIamResourceConstraint): boolean => ApiAuthorizationIamGlob.isMatched(constraint.pattern, row[constraint.placeholder] ?? "")));

					if (isClassified !== isMatched) {
						mismatches.push({ isMatched, kind: classification.kind, pattern, row, segments });
					}
				}
			}

			expect(mismatches.slice(0, 5)).toEqual([]);
			// Every class occurs, so no branch stays untested.
			expect(Object.keys(counts).sort()).toEqual([EApiAuthorizationIamResourceClass.ALL, EApiAuthorizationIamResourceClass.AMBIGUOUS, EApiAuthorizationIamResourceClass.NONE, EApiAuthorizationIamResourceClass.PARTIAL].sort());
			expect(counts[EApiAuthorizationIamResourceClass.PARTIAL]).toBeGreaterThan(50);
		});

		it("says exactly what the glob says about each row a slot's alphabet allows", () => {
			const random: () => number = createRandom(4_242);
			const alphabets: ReadonlyMap<string, RegExp> = new Map([
				["x", /^[ab]$/],
				["y", /^[ab]$/],
			]);
			const allowed: Array<string> = VALUES.filter((value: string): boolean => !value.includes("/"));
			const mismatches: Array<unknown> = [];

			for (let index: number = 0; index < 1500; index++) {
				const segments: Array<IApiAuthorizationIamResourceSegment> = TEMPLATES[Math.floor(random() * TEMPLATES.length)] ?? [];
				const pattern: string = Array.from({ length: Math.floor(random() * 7) + 1 }, (): string => SYMBOLS[Math.floor(random() * SYMBOLS.length)] ?? "*").join("");
				const tokens: Array<IApiAuthorizationIamToken> = ApiAuthorizationIamGlob.readTokens(pattern);
				const classification: IApiAuthorizationIamResourceClassification = ApiAuthorizationIamResourcePattern.classify(tokens, segments, alphabets);

				if (classification.kind === EApiAuthorizationIamResourceClass.AMBIGUOUS) {
					continue;
				}

				for (const row of readRows(segments).filter((candidate: Record<string, string>): boolean => Object.values(candidate).every((value: string): boolean => allowed.includes(value)))) {
					const isMatched: boolean = ApiAuthorizationIamGlob.isMatched(tokens, render(segments, row));
					const isClassified: boolean = classification.kind === EApiAuthorizationIamResourceClass.ALL || (classification.kind === EApiAuthorizationIamResourceClass.PARTIAL && classification.constraints.every((constraint: IApiAuthorizationIamResourceConstraint): boolean => ApiAuthorizationIamGlob.isMatched(constraint.pattern, row[constraint.placeholder] ?? "")));

					if (isClassified !== isMatched) {
						mismatches.push({ isMatched, kind: classification.kind, pattern, row, segments });
					}
				}
			}

			expect(mismatches.slice(0, 5)).toEqual([]);
		});
	});
});
