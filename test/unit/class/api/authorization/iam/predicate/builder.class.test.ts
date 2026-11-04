import type { IApiAuthorizationIamCondition, IApiAuthorizationIamPredicateColumn, IApiAuthorizationIamPredicatePair } from "@interface/class/api/authorization";
import type { TApiAuthorizationIamPredicate } from "@type/class/api/authorization/iam";

import { ApiAuthorizationIamPredicateBuilder } from "@class/api/authorization/iam";
import { EApiAuthorizationIamColumnFamily, EApiAuthorizationIamPredicateComparison, EApiAuthorizationIamPredicateKind, EApiAuthorizationIamTokenType, EApiPolicyConditionOperator, EApiPolicyConditionOperatorFamily } from "@enum/class/authorization";
import { createIamLowererColumn } from "@test/unit/class/api/authorization/iam/fixture/lowerer";
import { describe, expect, it } from "vitest";

// A row as SQL sees it: each query path holds text or NULL.
type TRow = Record<string, null | string>;

/**
 * Tells whether a WHERE clause selects a row: only a TRUE predicate does, never an UNKNOWN one.
 * @param {TApiAuthorizationIamPredicate} predicate - Predicate.
 * @param {TRow} row - Row.
 * @returns {boolean} Whether the predicate is TRUE for the row.
 */
function isSelected(predicate: TApiAuthorizationIamPredicate, row: TRow): boolean {
	return evaluateSql(predicate, row) === true;
}

/**
 * Evaluates a predicate over a row with SQL semantics, where a comparison with NULL is UNKNOWN; the predicate holds
 * only when it is TRUE.
 * @param {TApiAuthorizationIamPredicate} predicate - Predicate.
 * @param {TRow} row - Row.
 * @returns {boolean | undefined} TRUE, FALSE, or undefined for UNKNOWN.
 */
function evaluateSql(predicate: TApiAuthorizationIamPredicate, row: TRow): boolean | undefined {
	switch (predicate.kind) {
		case EApiAuthorizationIamPredicateKind.AND: {
			const results: Array<boolean | undefined> = predicate.children.map((child: TApiAuthorizationIamPredicate): boolean | undefined => evaluateSql(child, row));

			return results.includes(false) ? false : results.includes(undefined) ? undefined : true;
		}

		case EApiAuthorizationIamPredicateKind.FALSE: {
			return false;
		}

		case EApiAuthorizationIamPredicateKind.IN: {
			const value: null | string | undefined = row[predicate.column.queryPath];

			if (value === null || value === undefined) {
				return undefined;
			}

			return predicate.values.includes(value) !== predicate.isNegated;
		}

		case EApiAuthorizationIamPredicateKind.IS_NULL: {
			return (row[predicate.column.queryPath] ?? null) === null;
		}

		case EApiAuthorizationIamPredicateKind.LIKE: {
			const value: null | string | undefined = row[predicate.column.queryPath];
			const prefix: string = predicate.pattern[0]?.value ?? "";

			return value === null || value === undefined ? undefined : value.startsWith(prefix) !== predicate.isNegated;
		}

		case EApiAuthorizationIamPredicateKind.NOT_NULL: {
			return (row[predicate.column.queryPath] ?? null) !== null;
		}

		case EApiAuthorizationIamPredicateKind.OR: {
			const results: Array<boolean | undefined> = predicate.children.map((child: TApiAuthorizationIamPredicate): boolean | undefined => evaluateSql(child, row));

			return results.includes(true) ? true : results.includes(undefined) ? undefined : false;
		}

		case EApiAuthorizationIamPredicateKind.TRUE: {
			return true;
		}
	}
}

const createCondition = (isNegated: boolean, isIfExists: boolean): IApiAuthorizationIamCondition => ({ family: EApiPolicyConditionOperatorFamily.STRING, isIfExists, isNegated, key: "resource.name", operator: EApiPolicyConditionOperator.STRING_EQUALS, source: "StringEquals", values: [] });

const NAME: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("owner.name", {}, { isOptional: true, presencePath: "owner.id" });
const PRESENCE: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("owner.id", { isNullable: false, isPrimary: true });

// Every row shape of an optional path: relation missing, NULL column, the value, another value, and "".
const ROWS: Array<{ isMissing: boolean; row: TRow; text: string }> = [
	{ isMissing: true, row: { "owner.id": null, "owner.name": null }, text: "" },
	{ isMissing: false, row: { "owner.id": "o1", "owner.name": null }, text: "" },
	{ isMissing: false, row: { "owner.id": "o1", "owner.name": "ann" }, text: "ann" },
	{ isMissing: false, row: { "owner.id": "o1", "owner.name": "bob" }, text: "bob" },
	{ isMissing: false, row: { "owner.id": "o1", "owner.name": "" }, text: "" },
];

describe("ApiAuthorizationIamPredicateBuilder", () => {
	describe("buildCondition", () => {
		it.each([
			[false, false],
			[false, true],
			[true, false],
			[true, true],
		])("is NULL-complete and equals the in-memory evaluator for isNegated=%s, isIfExists=%s", (isNegated: boolean, isIfExists: boolean) => {
			const pair: IApiAuthorizationIamPredicatePair | undefined = ApiAuthorizationIamPredicateBuilder.buildCondition({ column: NAME, comparison: EApiAuthorizationIamPredicateComparison.TEXT, condition: createCondition(isNegated, isIfExists), presence: PRESENCE, values: ["ann"] });

			expect(pair).toBeDefined();

			for (const { isMissing, row, text } of ROWS) {
				// The in-memory evaluator: IfExists holds for a missing key; otherwise a NULL compares as "".
				const expected: boolean = isIfExists && isMissing ? true : (text === "ann") !== isNegated;

				expect([isSelected(pair?.holds ?? { kind: EApiAuthorizationIamPredicateKind.FALSE }, row), isSelected(pair?.fails ?? { kind: EApiAuthorizationIamPredicateKind.FALSE }, row)]).toEqual([expected, !expected]);
			}
		});

		it("never negates a comparison without its NULL branch", () => {
			const pair: IApiAuthorizationIamPredicatePair | undefined = ApiAuthorizationIamPredicateBuilder.buildCondition({ column: NAME, comparison: EApiAuthorizationIamPredicateComparison.TEXT, condition: createCondition(true, false), values: ["ann"] });

			expect(pair?.holds).toEqual({
				children: [
					{ column: NAME, comparison: EApiAuthorizationIamPredicateComparison.TEXT, isNegated: true, kind: EApiAuthorizationIamPredicateKind.IN, values: ["ann"] },
					{ column: NAME, kind: EApiAuthorizationIamPredicateKind.IS_NULL },
				],
				kind: EApiAuthorizationIamPredicateKind.OR,
			});
		});

		it("reads IfExists as the plain operator on a path that crosses no relation", () => {
			const column: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("name");

			expect(ApiAuthorizationIamPredicateBuilder.buildCondition({ column, comparison: EApiAuthorizationIamPredicateComparison.TEXT, condition: createCondition(false, true), values: ["ann"] })).toEqual(ApiAuthorizationIamPredicateBuilder.buildCondition({ column, comparison: EApiAuthorizationIamPredicateComparison.TEXT, condition: createCondition(false, false), values: ["ann"] }));
		});

		it("does not build a positive IfExists on an optional path without a presence column, another operator family, or no value", () => {
			expect(ApiAuthorizationIamPredicateBuilder.buildCondition({ column: NAME, comparison: EApiAuthorizationIamPredicateComparison.TEXT, condition: createCondition(false, true), values: ["ann"] })).toBeUndefined();
			expect(ApiAuthorizationIamPredicateBuilder.buildCondition({ column: NAME, comparison: EApiAuthorizationIamPredicateComparison.TEXT, condition: { ...createCondition(false, false), family: EApiPolicyConditionOperatorFamily.NUMERIC }, presence: PRESENCE, values: ["1"] })).toBeUndefined();
			expect(ApiAuthorizationIamPredicateBuilder.buildCondition({ column: NAME, comparison: EApiAuthorizationIamPredicateComparison.TEXT, condition: createCondition(false, false), presence: PRESENCE, values: [] })).toBeUndefined();
		});
	});

	describe("resource-pattern constraints", () => {
		const CODE: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("code");

		it.each([
			["a value on a text column", EApiAuthorizationIamPredicateComparison.TEXT, "x", [null, "", "x", "y"], [false, false, true, false]],
			["the empty value on a text column, which a NULL renders as", EApiAuthorizationIamPredicateComparison.TEXT, "", [null, "", "x"], [true, true, false]],
			["the empty value on a numeric column, which only a NULL renders as", EApiAuthorizationIamPredicateComparison.NATIVE, "", [null, "7"], [true, false]],
		])("splits every row for %s", (_name: string, comparison: EApiAuthorizationIamPredicateComparison, value: string, values: Array<null | string>, expected: Array<boolean>) => {
			const pair: IApiAuthorizationIamPredicatePair = ApiAuthorizationIamPredicateBuilder.buildExactConstraint({ column: CODE, comparison, value });

			expect(values.map((code: null | string): Array<boolean> => [isSelected(pair.holds, { code }), isSelected(pair.fails, { code })])).toEqual(expected.map((isHeld: boolean): Array<boolean> => [isHeld, !isHeld]));
		});

		it("splits every row for a prefix, which a NULL never starts", () => {
			const pair: IApiAuthorizationIamPredicatePair = ApiAuthorizationIamPredicateBuilder.buildPrefixConstraint({ column: CODE, prefix: "ab" });

			expect(pair.holds).toEqual({ column: CODE, isNegated: false, kind: EApiAuthorizationIamPredicateKind.LIKE, pattern: [{ type: EApiAuthorizationIamTokenType.LITERAL, value: "ab" }, { type: EApiAuthorizationIamTokenType.STAR }] });
			expect([null, "", "ab", "abc", "b"].map((code: null | string): Array<boolean> => [isSelected(pair.holds, { code }), isSelected(pair.fails, { code })])).toEqual([
				[false, true],
				[false, true],
				[true, false],
				[true, false],
				[false, true],
			]);
		});

		it("holds for every row with the empty prefix", () => {
			expect(ApiAuthorizationIamPredicateBuilder.buildPrefixConstraint({ column: CODE, prefix: "" })).toEqual({ fails: { kind: EApiAuthorizationIamPredicateKind.FALSE }, holds: { kind: EApiAuthorizationIamPredicateKind.TRUE } });
		});
	});

	describe("and / or", () => {
		const IS_NULL: TApiAuthorizationIamPredicate = { column: NAME, kind: EApiAuthorizationIamPredicateKind.IS_NULL };
		const NOT_NULL: TApiAuthorizationIamPredicate = { column: NAME, kind: EApiAuthorizationIamPredicateKind.NOT_NULL };

		it("folds constants, flattens nested groups of the same kind and unwraps one child", () => {
			expect(ApiAuthorizationIamPredicateBuilder.and([])).toEqual({ kind: EApiAuthorizationIamPredicateKind.TRUE });
			expect(ApiAuthorizationIamPredicateBuilder.or([])).toEqual({ kind: EApiAuthorizationIamPredicateKind.FALSE });
			expect(ApiAuthorizationIamPredicateBuilder.and([IS_NULL, { kind: EApiAuthorizationIamPredicateKind.FALSE }])).toEqual({ kind: EApiAuthorizationIamPredicateKind.FALSE });
			expect(ApiAuthorizationIamPredicateBuilder.or([IS_NULL, { kind: EApiAuthorizationIamPredicateKind.TRUE }])).toEqual({ kind: EApiAuthorizationIamPredicateKind.TRUE });
			expect(ApiAuthorizationIamPredicateBuilder.and([{ kind: EApiAuthorizationIamPredicateKind.TRUE }, IS_NULL])).toEqual(IS_NULL);
			expect(ApiAuthorizationIamPredicateBuilder.or([IS_NULL, ApiAuthorizationIamPredicateBuilder.or([NOT_NULL, IS_NULL])])).toEqual({ children: [IS_NULL, NOT_NULL, IS_NULL], kind: EApiAuthorizationIamPredicateKind.OR });
		});
	});

	describe("column checks", () => {
		it.each([
			[EApiAuthorizationIamColumnFamily.TEXT, true],
			[EApiAuthorizationIamColumnFamily.UUID, true],
			[EApiAuthorizationIamColumnFamily.ENUM, true],
			[EApiAuthorizationIamColumnFamily.NUMERIC, false],
			[EApiAuthorizationIamColumnFamily.DATE, false],
			[EApiAuthorizationIamColumnFamily.JSON, false],
			[EApiAuthorizationIamColumnFamily.ARRAY, false],
			[EApiAuthorizationIamColumnFamily.BINARY, false],
			[EApiAuthorizationIamColumnFamily.OTHER, false],
		])("lets a String operator compare a %s column: %s", (family: EApiAuthorizationIamColumnFamily, isComparable: boolean) => {
			const column: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("code", { family });

			expect(ApiAuthorizationIamPredicateBuilder.isStringComparable(column.field)).toBe(isComparable);
			expect(ApiAuthorizationIamPredicateBuilder.isTextColumn(column.field)).toBe(isComparable);
		});

		it("lets a String operator compare a boolean column, which is no text column", () => {
			const column: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("flag", { family: EApiAuthorizationIamColumnFamily.BOOLEAN }, { isBoolean: true });

			expect(ApiAuthorizationIamPredicateBuilder.isStringComparable(column.field)).toBe(true);
			expect(ApiAuthorizationIamPredicateBuilder.isTextColumn(column.field)).toBe(false);
		});
	});
});
