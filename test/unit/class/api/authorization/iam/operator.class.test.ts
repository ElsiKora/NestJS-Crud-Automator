import type { IApiAuthorizationIamCondition, IApiAuthorizationIamOperand, IApiAuthorizationIamStatement } from "@interface/class/api/authorization";

import { ApiAuthorizationIamOperator, ApiAuthorizationIamParser } from "@class/api/authorization/iam";
import { EApiPolicyEffect } from "@enum/class/authorization";
import { describe, expect, it } from "vitest";

const MISSING: unique symbol = Symbol("missing");

const readCondition = (operator: string, value: unknown, key: string = "principal.attributes.value"): IApiAuthorizationIamCondition => {
	const statement: IApiAuthorizationIamStatement = ApiAuthorizationIamParser.readStatement({ Action: ["*"], Condition: { [operator]: { [key]: value } }, Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] });
	const condition: IApiAuthorizationIamCondition | undefined = statement.conditions[0];

	if (!condition) {
		throw new Error(`${operator} read no condition`);
	}

	return condition;
};

const CONTEXT: Record<string, unknown> = {
	principal: { attributes: { count: 5, empty: "", flag: true, list: ["a"], name: "ann", object: { a: 1 }, text: "12.5", when: "2024-01-01T00:00:00Z" }, id: "user-1", type: "user" },
	request: { parameters: { id: "item-1" }, sourceIp: "::ffff:10.0.0.1", time: new Date("2024-06-01T00:00:00.000Z") },
};

const evaluate = (operator: string, value: unknown, actual: unknown, isColumn: boolean = false): boolean | undefined => {
	const condition: IApiAuthorizationIamCondition = readCondition(operator, value);
	const operands: Array<IApiAuthorizationIamOperand> | undefined = ApiAuthorizationIamOperator.readOperands(condition, CONTEXT);

	return operands ? ApiAuthorizationIamOperator.evaluate(condition, actual === MISSING ? undefined : actual, operands, isColumn) : undefined;
};

const evaluateSet = (operator: string, value: unknown, actual: unknown, isColumn: boolean = false): boolean | undefined => {
	const condition: IApiAuthorizationIamCondition = readCondition(operator, value);
	const operands: Array<IApiAuthorizationIamOperand> | undefined = ApiAuthorizationIamOperator.readOperands(condition, CONTEXT);

	return operands ? ApiAuthorizationIamOperator.evaluateSet(condition, actual === MISSING ? undefined : actual, operands, isColumn) : undefined;
};

// Each row: positive operator, negated operator, a value, a value that holds, a value that does not, and a malformed value (undefined when the family reads any scalar).
const FAMILY_CASES: Array<[string, string | undefined, unknown, unknown, unknown, unknown]> = [
	["StringEquals", "StringNotEquals", "ann", "ann", "ANN", undefined],
	["StringEqualsIgnoreCase", "StringNotEqualsIgnoreCase", "Ann", "aNN", "anna", undefined],
	["StringLike", "StringNotLike", "a?n*", "annie", "bob", undefined],
	["NumericEquals", "NumericNotEquals", "1.5", "1.50", "1.51", "abc"],
	["DateEquals", "DateNotEquals", "2024-01-01T00:00:00Z", new Date("2024-01-01T00:00:00.000Z"), "2024-01-01T00:00:00.001Z", "yesterday"],
	["Bool", undefined, "true", true, false, "yes"],
	["IpAddress", "NotIpAddress", "10.0.0.0/8", "10.1.2.3", "11.0.0.1", "not-an-ip"],
	["ArnEquals", "ArnNotEquals", "a:*:c", "a:b:c", "a:b:d", undefined],
	["ArnLike", "ArnNotLike", "a:?:c*", "a:b:cd", "a:bb:cd", undefined],
];

describe("ApiAuthorizationIamOperator", () => {
	describe("the truth table of every operator family", () => {
		describe.each(FAMILY_CASES)("%s / %s", (positive: string, negative: string | undefined, value: unknown, holding: unknown, failing: unknown, malformed: unknown) => {
			it("holds and fails for present values, in the positive form", () => {
				expect(evaluate(positive, value, holding)).toBe(true);
				expect(evaluate(positive, value, failing)).toBe(false);
			});

			it("gives false for a missing or NULL value in the positive form", () => {
				expect(evaluate(positive, value, MISSING)).toBe(false);
				expect(evaluate(positive, value, null)).toBe(false);
			});

			it("holds for a missing value under IfExists, and applies the base operator on a NULL column", () => {
				expect(evaluate(`${positive}IfExists`, value, MISSING)).toBe(true);
				expect(evaluate(`${positive}IfExists`, value, null)).toBe(false);
				expect(evaluate(`${positive}IfExists`, value, holding)).toBe(true);
				expect(evaluate(`${positive}IfExists`, value, failing)).toBe(false);
			});

			it("fails closed on a list or an object", () => {
				expect(evaluate(positive, value, ["a"])).toBeUndefined();
				expect(evaluate(positive, value, { a: 1 })).toBeUndefined();
				expect(evaluate(`${positive}IfExists`, value, ["a"])).toBeUndefined();

				if (negative) {
					expect(evaluate(negative, value, ["a"])).toBeUndefined();
				}
			});

			if (negative) {
				it("negates the positive form, for a present, missing and NULL value", () => {
					expect(evaluate(negative, value, holding)).toBe(false);
					expect(evaluate(negative, value, failing)).toBe(true);
					expect(evaluate(negative, value, MISSING)).toBe(true);
					expect(evaluate(negative, value, null)).toBe(true);
				});

				it("holds for a missing value under IfExists in the negated form too", () => {
					expect(evaluate(`${negative}IfExists`, value, MISSING)).toBe(true);
					expect(evaluate(`${negative}IfExists`, value, null)).toBe(true);
					expect(evaluate(`${negative}IfExists`, value, holding)).toBe(false);
					expect(evaluate(`${negative}IfExists`, value, failing)).toBe(true);
				});
			}

			if (malformed !== undefined) {
				it("fails closed on a malformed value, in every form", () => {
					expect(evaluate(positive, value, malformed)).toBeUndefined();
					expect(evaluate(`${positive}IfExists`, value, malformed)).toBeUndefined();

					if (negative) {
						expect(evaluate(negative, value, malformed)).toBeUndefined();
						expect(evaluate(`${negative}IfExists`, value, malformed)).toBeUndefined();
					}
				});
			}
		});
	});

	describe("String family", () => {
		it("compares code points", () => {
			expect(evaluate("StringEquals", "ann", "Ann")).toBe(false);
			expect(evaluate("StringEquals", "ann", "ann ")).toBe(false);
			expect(evaluate("StringEquals", "5", 5)).toBe(true);
			expect(evaluate("StringEquals", "true", true)).toBe(true);
		});

		it('reads a missing or NULL value as "" against a literal ""', () => {
			expect(evaluate("StringEquals", "", MISSING)).toBe(true);
			expect(evaluate("StringEquals", "", null)).toBe(true);
			expect(evaluate("StringEquals", "", "")).toBe(true);
			expect(evaluate("StringNotEquals", "", null)).toBe(false);
			expect(evaluate("StringEqualsIgnoreCase", "", null)).toBe(true);
		});
	});

	describe("StringEqualsIgnoreCase", () => {
		it.each([
			["k", "K", true],
			["K", "k", true],
			// U+212A KELVIN SIGN folds to k under Unicode, not under the ASCII fold.
			["k", "K", false],
			["K", "K", false],
			// U+0130 and U+0131 fold to i only under Unicode or a Turkish locale.
			["i", "İ", false],
			["i", "ı", false],
			["I", "ı", false],
			// ß folds to ss under Unicode.
			["ss", "ß", false],
			["ß", "SS", false],
			// Letters outside A-Z stay as they are, on both sides.
			["é", "É", false],
			["straße", "STRAßE", true],
			["a_%", "A_%", true],
		])("folds only A-Z: %s and %s", (value: string, actual: string, isEqual: boolean) => {
			expect(evaluate("StringEqualsIgnoreCase", value, actual)).toBe(isEqual);
			expect(evaluate("StringNotEqualsIgnoreCase", value, actual)).toBe(!isEqual);
		});
	});

	describe("StringLike", () => {
		it.each([
			["a*", "a", true],
			["a*", "abc", true],
			["a*", "b", false],
			["a?c", "abc", true],
			["a?c", "ac", false],
			["*:x", "a:b:x", true],
			["?", "😀", true],
			["??", "😀", false],
			["a${*}", "a*", true],
			["a${*}", "ab", false],
			["a${?}", "a?", true],
			["a%", "abc", false],
			["a_", "ab", false],
			["A*", "abc", false],
		])("matches %s against %s", (value: string, actual: string, isMatched: boolean) => {
			expect(evaluate("StringLike", value, actual)).toBe(isMatched);
			expect(evaluate("StringNotLike", value, actual)).toBe(!isMatched);
		});

		it('reads a missing or NULL value as "", which a pattern that matches "" holds for', () => {
			for (const actual of [MISSING, null, ""]) {
				expect(evaluate("StringLike", "*", actual)).toBe(true);
				expect(evaluate("StringLike", "?", actual)).toBe(false);
				expect(evaluate("StringNotLike", "*", actual)).toBe(false);
				expect(evaluate("StringNotLike", "?", actual)).toBe(true);
			}
		});

		it("still holds for a missing value under IfExists, whatever the pattern", () => {
			expect(evaluate("StringNotLikeIfExists", "*", MISSING)).toBe(true);
			expect(evaluate("StringNotLikeIfExists", "*", null)).toBe(false);
			expect(evaluate("StringLikeIfExists", "?", MISSING)).toBe(true);
			expect(evaluate("StringLikeIfExists", "?", null)).toBe(false);
		});
	});

	describe("Numeric family", () => {
		it.each([
			["NumericEquals", "1.5", "1.50", true],
			["NumericEquals", "1.5", 1.5, true],
			["NumericEquals", 5, "5", true],
			["NumericEquals", "9007199254740993", "9007199254740992", false],
			["NumericEquals", "9223372036854775807", "9223372036854775807", true],
			["NumericLessThan", "2", 1, true],
			["NumericLessThan", "2", 2, false],
			["NumericLessThanEquals", "2", 2, true],
			["NumericLessThanEquals", "2", "2.000000000000000000000000000001", false],
			["NumericGreaterThan", "-1", 0, true],
			["NumericGreaterThan", "1.5", "1.5", false],
			["NumericGreaterThanEquals", "1.5", "1.50", true],
			["NumericGreaterThanEquals", "9223372036854775808", "9223372036854775807", false],
			["NumericNotEquals", "1.5", "1.50", false],
			["NumericNotEquals", "1.5", 2, true],
		])("%s %j on %j", (operator: string, value: unknown, actual: unknown, isHolding: boolean) => {
			expect(evaluate(operator, value, actual)).toBe(isHolding);
		});

		it.each(["", " 1", "1e3", "0x10", "01", true, {}, [], Number.NaN, Number.POSITIVE_INFINITY, new Date(0)])("fails closed on the context value %j", (actual: unknown) => {
			expect(evaluate("NumericEquals", "1", actual)).toBeUndefined();
			expect(evaluate("NumericNotEquals", "1", actual)).toBeUndefined();
		});

		it("fails closed on a context number past the safe range, which has lost its digits already", () => {
			expect(evaluate("NumericGreaterThan", "1", 2 ** 53)).toBeUndefined();
		});

		it("reads a column value a double holds through its shortest text, and the values only a column holds", () => {
			expect(evaluate("NumericEquals", "0.1", 0.1, true)).toBe(true);
			expect(evaluate("NumericGreaterThan", "0.3", 0.1 + 0.2, true)).toBe(true);
			expect(evaluate("NumericGreaterThan", "1", 2 ** 53, true)).toBe(true);

			for (const above of [Number.NaN, Number.POSITIVE_INFINITY, "NaN", "Infinity"]) {
				expect(evaluate("NumericGreaterThan", "1", above, true)).toBe(true);
				expect(evaluate("NumericLessThan", "1", above, true)).toBe(false);
				expect(evaluate("NumericEquals", "1", above, true)).toBe(false);
				expect(evaluate("NumericNotEquals", "1", above, true)).toBe(true);
			}

			for (const below of [Number.NEGATIVE_INFINITY, "-Infinity"]) {
				expect(evaluate("NumericLessThan", "1", below, true)).toBe(true);
				expect(evaluate("NumericGreaterThanEquals", "1", below, true)).toBe(false);
			}
		});
	});

	describe("Date family", () => {
		it.each([
			["DateEquals", "2024-01-01T12:00:00+02:00", "2024-01-01T10:00:00Z", true],
			["DateLessThan", "2024-01-01T00:00:00Z", new Date("2023-12-31T23:59:59.999Z"), true],
			["DateLessThan", "2024-01-01T00:00:00Z", new Date("2024-01-01T00:00:00.000Z"), false],
			["DateLessThanEquals", "2024-01-01T00:00:00Z", new Date("2024-01-01T00:00:00.000Z"), true],
			["DateGreaterThan", "2024-01-01T00:00:00Z", new Date("2024-01-01T00:00:00.001Z"), true],
			["DateGreaterThanEquals", "2024-01-01T00:00:00.001Z", new Date("2024-01-01T00:00:00.000Z"), false],
			["DateNotEquals", "2024-01-01T00:00:00Z", new Date("2024-01-01T00:00:00.000Z"), false],
			["DateEquals", "2024-01-01", "2024-01-01", true],
			["DateLessThan", "2024-01-02", "2024-01-01", true],
		])("%s %s on %j", (operator: string, value: string, actual: unknown, isHolding: boolean) => {
			expect(evaluate(operator, value, actual)).toBe(isHolding);
		});

		it.each([
			["a calendar date with an instant", "2024-01-01", "2024-01-01T00:00:00Z"],
			["an instant with a calendar date", "2024-01-01T00:00:00Z", "2024-01-01"],
			["a value without a zone", "2024-01-01T00:00:00Z", "2024-01-01T00:00:00"],
			["a value finer than milliseconds", "2024-01-01T00:00:00Z", "2024-01-01T00:00:00.123456Z"],
			["epoch seconds", "2024-01-01T00:00:00Z", 1704067200],
			["a boolean", "2024-01-01T00:00:00Z", true],
		])("fails closed on %s", (_name: string, value: string, actual: unknown) => {
			expect(evaluate("DateEquals", value, actual)).toBeUndefined();
			expect(evaluate("DateNotEquals", value, actual)).toBeUndefined();
		});

		it("reads the infinities PostgreSQL holds, only on a column", () => {
			expect(evaluate("DateGreaterThan", "2024-01-01T00:00:00Z", Number.POSITIVE_INFINITY, true)).toBe(true);
			expect(evaluate("DateLessThan", "2024-01-01T00:00:00Z", Number.NEGATIVE_INFINITY, true)).toBe(true);
			expect(evaluate("DateGreaterThan", "2024-01-01T00:00:00Z", Number.POSITIVE_INFINITY)).toBeUndefined();
		});

		it("compares with request.time through a variable", () => {
			expect(evaluate("DateLessThan", "${request.time}", "2024-01-01T00:00:00Z")).toBe(true);
			expect(evaluate("DateLessThan", "${request.time}", "2025-01-01T00:00:00Z")).toBe(false);
		});
	});

	describe("Bool", () => {
		it.each([
			[true, true, true],
			["true", true, true],
			[false, false, true],
			["false", false, true],
			[true, false, false],
			[true, "true", true],
			[false, "false", true],
			[true, "false", false],
		])("reads %j against %j strictly", (value: unknown, actual: unknown, isHolding: boolean) => {
			expect(evaluate("Bool", value, actual)).toBe(isHolding);
		});

		it.each([1, 0, "1", "0", "TRUE", "yes", "", {}])("fails closed on %j", (actual: unknown) => {
			expect(evaluate("Bool", true, actual)).toBeUndefined();
		});
	});

	describe("Null", () => {
		it.each([
			[true, MISSING, true],
			[true, null, true],
			[true, "", false],
			[true, 0, false],
			[true, false, false],
			[true, "a", false],
			["true", null, true],
			[false, MISSING, false],
			[false, null, false],
			[false, "", true],
			["false", "a", true],
			[false, ["a"], true],
		])("Null %j on %j", (value: unknown, actual: unknown, isHolding: boolean) => {
			expect(evaluate("Null", value, actual)).toBe(isHolding);
		});
	});

	describe("IpAddress", () => {
		it("reads an IPv4-mapped context address as IPv4", () => {
			expect(evaluate("IpAddress", "10.0.0.0/8", "::ffff:10.1.2.3")).toBe(true);
			expect(evaluate("NotIpAddress", "10.0.0.0/8", "::ffff:10.1.2.3")).toBe(false);
		});

		it("keeps a column value in its own family and network, as PostgreSQL reads it", () => {
			expect(evaluate("IpAddress", "10.0.0.0/8", "::ffff:10.1.2.3", true)).toBe(false);
			expect(evaluate("IpAddress", "10.0.0.0/8", "10.1.0.0/16", true)).toBe(true);
			expect(evaluate("IpAddress", "10.1.2.3", "10.1.2.3/16", true)).toBe(false);
		});

		it("fails closed on a context value that is a network or carries a zone", () => {
			expect(evaluate("IpAddress", "10.0.0.0/8", "10.1.0.0/16")).toBeUndefined();
			expect(evaluate("IpAddress", "fe80::/10", "fe80::1%eth0")).toBeUndefined();
			expect(evaluate("IpAddress", "10.0.0.0/8", 5)).toBeUndefined();
		});

		it("compares a mapped request.sourceIp variable with the range it names", () => {
			expect(evaluate("IpAddress", "${request.sourceIp}", "10.0.0.1")).toBe(true);
		});
	});

	describe("Arn family", () => {
		it.each([
			["a:b:c", "a:b:c", true],
			["a:b:c", "a:b", false],
			["a:b", "a:b:c", false],
			["*", "a", true],
			["*", "", true],
			["*", "a:b", false],
			["a:*", "a:b", true],
			["a:*", "a:b:c", false],
			["a:*:c", "a::c", true],
			["a:?:c", "a::c", false],
			["a:?:c", "a:😀:c", true],
			["a:?:c", "a:::c", false],
			["project-core:internal:user-*", "project-core:internal:user-restriction", true],
			["project-core:internal:user-*", "project-core:internal:user:restriction", false],
			["a${*}:b", "a*:b", true],
			["a${*}:b", "ax:b", false],
			["A:b", "a:b", false],
		])("matches %s against %s per segment", (value: string, actual: string, isMatched: boolean) => {
			for (const operator of ["ArnEquals", "ArnLike"]) {
				expect(evaluate(operator, value, actual)).toBe(isMatched);
			}

			for (const operator of ["ArnNotEquals", "ArnNotLike"]) {
				expect(evaluate(operator, value, actual)).toBe(!isMatched);
			}
		});
	});

	describe("several values of one key", () => {
		// Positive operator, negated operator, two values, a value matching the first, one matching the second, and one matching neither.
		const CASES: Array<[string, string, [unknown, unknown], unknown, unknown, unknown]> = [
			["StringEquals", "StringNotEquals", ["ann", "bob"], "ann", "bob", "eve"],
			["StringEqualsIgnoreCase", "StringNotEqualsIgnoreCase", ["Ann", "Bob"], "aNN", "BOB", "eve"],
			["StringLike", "StringNotLike", ["a*", "b?b"], "ann", "bob", "eve"],
			["NumericEquals", "NumericNotEquals", ["1.5", "2"], "1.50", "2.0", "3"],
			["DateEquals", "DateNotEquals", ["2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z"], "2024-01-01T00:00:00.000Z", "2024-01-02T00:00:00.000Z", "2024-01-03T00:00:00.000Z"],
			["IpAddress", "NotIpAddress", ["10.0.0.0/8", "192.168.0.0/16"], "10.1.2.3", "192.168.1.1", "11.0.0.1"],
			["ArnEquals", "ArnNotEquals", ["a:*:c", "x:y:*"], "a:b:c", "x:y:z", "a:b:d"],
			["ArnLike", "ArnNotLike", ["a:*:c", "x:y:*"], "a:b:c", "x:y:z", "a:b:d"],
		];

		it.each(CASES)("%s holds if any value matches and %s if none does", (positive: string, negated: string, values: [unknown, unknown], first: unknown, second: unknown, neither: unknown) => {
			expect([first, second, neither].map((actual: unknown): boolean | undefined => evaluate(positive, values, actual))).toEqual([true, true, false]);
			expect([first, second, neither].map((actual: unknown): boolean | undefined => evaluate(negated, values, actual))).toEqual([false, false, true]);
		});

		it.each(CASES)("%s and %s read a missing value as they do with one value", (positive: string, negated: string, values: [unknown, unknown]) => {
			expect(evaluate(positive, values, MISSING)).toBe(evaluate(positive, values[0], MISSING));
			expect(evaluate(negated, values, MISSING)).toBe(evaluate(negated, values[0], MISSING));
			expect(evaluate(positive, values, null, true)).toBe(evaluate(positive, values[0], null, true));
			expect(evaluate(negated, values, null, true)).toBe(evaluate(negated, values[0], null, true));
		});

		it("holds Bool on either value and Null on either answer", () => {
			expect(evaluate("Bool", ["true", "false"], true)).toBe(true);
			expect(evaluate("Bool", ["true", "false"], false)).toBe(true);
			expect(evaluate("Bool", ["true", "false"], MISSING)).toBe(false);
			expect(evaluate("Null", ["true", "false"], MISSING)).toBe(true);
			expect(evaluate("Null", ["true", "false"], "x")).toBe(true);
			expect(evaluate("Null", ["true", "true"], "x")).toBe(false);
		});

		it("holds an operator with IfExists on a missing value", () => {
			expect(evaluate("StringEqualsIfExists", ["ann", "bob"], MISSING)).toBe(true);
			expect(evaluate("StringEqualsIfExists", ["ann", "bob"], "eve")).toBe(false);
		});

		it.each([
			["NumericEquals", ["1", "2"], "abc"],
			["NumericNotEquals", ["1", "2"], "abc"],
			["DateEquals", ["2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z"], "yesterday"],
			["IpAddress", ["10.0.0.0/8", "192.168.0.0/16"], "not-an-ip"],
			["Bool", ["true", "false"], "yes"],
			["StringEquals", ["ann", "bob"], ["ann"]],
			["StringNotEquals", ["ann", "bob"], { a: 1 }],
		])("cannot read for %s %j a value %j the family cannot read", (operator: string, values: Array<string>, actual: unknown) => {
			expect(evaluate(operator, values, actual)).toBeUndefined();
		});

		it("reads one operand per value, and none when any value does not resolve", () => {
			expect(ApiAuthorizationIamOperator.readOperands(readCondition("StringEquals", ["a", "${principal.id}"]), CONTEXT)).toEqual([{ text: "a" }, { text: "user-1" }]);
			expect(ApiAuthorizationIamOperator.readOperands(readCondition("StringEquals", ["a", "${principal.attributes.missing}"]), CONTEXT)).toBeUndefined();
			expect(evaluate("StringEquals", ["ann", "${principal.attributes.missing}"], "ann")).toBeUndefined();
		});
	});

	describe("set qualifiers", () => {
		// Qualified operator, values, the set a key reads, and whether the key holds.
		it.each<[string, unknown, unknown, boolean]>([
			["ForAnyValue:StringEquals", ["a", "b"], MISSING, false],
			["ForAnyValue:StringEquals", ["a", "b"], null, false],
			["ForAnyValue:StringEquals", ["a", "b"], [], false],
			["ForAnyValue:StringEquals", ["a", "b"], ["c"], false],
			["ForAnyValue:StringEquals", ["a", "b"], ["c", "b"], true],
			["ForAnyValue:StringEquals", ["a", "b"], ["a", "b"], true],
			["ForAnyValue:StringEquals", ["a", "b"], "a", true],
			["ForAnyValue:StringEquals", ["a", "b"], "c", false],
			["ForAllValues:StringEquals", ["a", "b"], MISSING, true],
			["ForAllValues:StringEquals", ["a", "b"], null, true],
			["ForAllValues:StringEquals", ["a", "b"], [], true],
			["ForAllValues:StringEquals", ["a", "b"], ["c"], false],
			["ForAllValues:StringEquals", ["a", "b"], ["a", "c"], false],
			["ForAllValues:StringEquals", ["a", "b"], ["b", "a", "a"], true],
			["ForAllValues:StringEquals", ["a", "b"], "a", true],
			["ForAnyValue:StringNotEquals", ["a", "b"], MISSING, false],
			["ForAnyValue:StringNotEquals", ["a", "b"], [], false],
			["ForAnyValue:StringNotEquals", ["a", "b"], ["a", "b"], false],
			["ForAnyValue:StringNotEquals", ["a", "b"], ["a", "c"], true],
			["ForAllValues:StringNotEquals", ["a", "b"], MISSING, true],
			["ForAllValues:StringNotEquals", ["a", "b"], [], true],
			["ForAllValues:StringNotEquals", ["a", "b"], ["c", "d"], true],
			["ForAllValues:StringNotEquals", ["a", "b"], ["c", "a"], false],
			["ForAnyValue:StringEqualsIfExists", "a", MISSING, true],
			["ForAnyValue:StringEqualsIfExists", "a", null, true],
			["ForAnyValue:StringEqualsIfExists", "a", [], true],
			["ForAnyValue:StringEqualsIfExists", "a", ["c"], false],
			["ForAnyValue:StringEqualsIfExists", "a", ["c", "a"], true],
			["ForAllValues:StringEqualsIfExists", "a", MISSING, true],
			["ForAllValues:StringEqualsIfExists", "a", [], true],
			["ForAllValues:StringEqualsIfExists", "a", ["a", "c"], false],
			["ForAnyValue:StringNotEqualsIfExists", "a", MISSING, true],
			["ForAnyValue:StringNotEqualsIfExists", "a", ["a"], false],
			["ForAnyValue:StringLike", ["a*", "b*"], ["x", "bc"], true],
			["ForAllValues:StringLike", ["a*", "b*"], ["ax", "bc"], true],
			["ForAllValues:StringLike", ["a*", "b*"], ["ax", "c"], false],
			["ForAllValues:StringNotLike", ["a*", "b*"], ["c", "d"], true],
			["ForAnyValue:NumericGreaterThan", ["10", "5"], [1, 7], true],
			["ForAllValues:NumericGreaterThan", ["10", "5"], [1, 7], false],
			["ForAnyValue:Bool", "true", [false, true], true],
			["ForAllValues:Bool", "true", [false, true], false],
			["ForAnyValue:DateLessThan", "2024-01-02T00:00:00Z", ["2024-01-03T00:00:00Z", "2024-01-01T00:00:00Z"], true],
			["ForAnyValue:IpAddress", "10.0.0.0/8", ["11.0.0.1", "10.0.0.1"], true],
			["ForAllValues:NotIpAddress", "10.0.0.0/8", ["11.0.0.1", "10.0.0.1"], false],
			["ForAnyValue:ArnLike", "a:*", ["b:c", "a:c"], true],
		])("%s %j on %j", (operator: string, values: unknown, actual: unknown, isHolding: boolean) => {
			expect(evaluateSet(operator, values, actual)).toBe(isHolding);
		});

		it.each<[string, unknown]>([
			["ForAnyValue:StringEquals", ["a", { nested: true }]],
			["ForAllValues:StringEquals", ["a", { nested: true }]],
			["ForAnyValue:StringEquals", ["a", null]],
			["ForAllValues:StringNotEquals", ["c", undefined]],
			["ForAnyValue:StringEquals", ["a", ["b"]]],
			["ForAnyValue:StringEquals", { a: 1 }],
		])("cannot read for %s a request set %j with an element that is no scalar, whatever the other elements say", (operator: string, actual: unknown) => {
			expect(evaluateSet(operator, "a", actual)).toBeUndefined();
		});

		it("cannot read an element the family cannot read", () => {
			expect(evaluateSet("ForAnyValue:NumericEquals", "1", [1, "abc"])).toBeUndefined();
			expect(evaluateSet("ForAllValues:NumericEquals", "1", [2, "abc"])).toBeUndefined();
		});

		// A NULL related column compares as the operator does on a NULL column, and a list holds no missing element.
		it.each<[string, unknown, unknown, boolean]>([
			["ForAnyValue:StringEquals", "a", [null], false],
			["ForAnyValue:StringNotEquals", "a", [null], true],
			["ForAllValues:StringEquals", "a", ["a", null], false],
			["ForAllValues:StringNotEquals", "a", ["b", null], true],
			["ForAnyValue:StringLike", "*", [null], true],
			["ForAllValues:StringLike", "a*", [null], false],
			["ForAnyValue:StringEqualsIgnoreCase", "a", [null], false],
			["ForAnyValue:NumericEquals", "1", [null], false],
			["ForAnyValue:NumericNotEquals", "1", [null], true],
			["ForAnyValue:Bool", "true", [null], false],
			["ForAnyValue:DateEquals", "2024-01-01T00:00:00Z", [null], false],
			["ForAllValues:DateNotEquals", "2024-01-01T00:00:00Z", [null], true],
			["ForAnyValue:IpAddress", "10.0.0.0/8", [null], false],
			["ForAllValues:NotIpAddress", "10.0.0.0/8", [null], true],
			["ForAnyValue:ArnLike", "a:*", [null], false],
			["ForAnyValue:NumericGreaterThan", "1", ["NaN"], true],
		])("%s %j on the column values %j", (operator: string, values: unknown, actual: unknown, isHolding: boolean) => {
			expect(evaluateSet(operator, values, actual, true)).toBe(isHolding);
		});

		it("keeps the unresolved operand closed", () => {
			expect(evaluateSet("ForAllValues:StringEquals", "${principal.attributes.missing}", [])).toBeUndefined();
			expect(evaluateSet("ForAnyValue:StringEquals", ["a", "${principal.attributes.missing}"], ["a"])).toBeUndefined();
		});
	});

	describe("readOperands", () => {
		const read = (operator: string, value: unknown, key?: string): IApiAuthorizationIamOperand | undefined => ApiAuthorizationIamOperator.readOperands(readCondition(operator, value, key), CONTEXT)?.[0];

		it.each([
			["a variable that names nothing", "StringEquals", "${principal.attributes.missing}"],
			["a variable that holds an empty text", "StringEquals", "${principal.attributes.empty}"],
			["a variable that holds a list", "StringEquals", "${principal.attributes.list}"],
			["a variable that holds an object", "StringEquals", "${principal.attributes.object}"],
			["an embedded variable that names nothing", "StringEquals", "x-${principal.attributes.missing}"],
			["a variable a Numeric operator cannot read", "NumericEquals", "${principal.attributes.name}"],
			["a variable a Date operator cannot read", "DateEquals", "${principal.attributes.name}"],
			["a variable an Ip operator cannot read", "IpAddress", "${principal.attributes.name}"],
			["a variable Bool cannot read", "Bool", "${principal.attributes.name}"],
			["a pattern variable that names nothing", "StringLike", "${principal.attributes.missing}*"],
			["a resource variable with no resource loaded", "StringEquals", "${resource.status}"],
			["a resource variable with a default and no resource loaded", "StringEquals", "${resource.status, 'x'}"],
		])("reads no operand for %s", (_name: string, operator: string, value: string) => {
			expect(read(operator, value)).toBeUndefined();
		});

		it("takes the default of a variable that does not resolve, for each family that reads text", () => {
			expect(read("StringEquals", "${principal.attributes.missing, 'x'}")?.text).toBe("x");
			expect(read("NumericEquals", "${principal.attributes.missing, '5'}")?.decimal).toBeDefined();
			expect(read("DateEquals", "${principal.attributes.missing, '2024-01-01T00:00:00Z'}")?.date?.text).toBe("2024-01-01T00:00:00.000Z");
			expect(read("Bool", "${principal.attributes.missing, 'true'}")?.isTrue).toBe(true);
			expect(read("IpAddress", "${principal.attributes.missing, '10.0.0.1'}")?.network?.text).toBe("10.0.0.1");
		});

		it("substitutes an embedded variable as literal text", () => {
			expect(read("StringEquals", "x-${principal.id}-y")?.text).toBe("x-user-1-y");
			expect(read("StringEquals", "${principal.attributes.count}/${principal.attributes.flag}")?.text).toBe("5/true");
		});

		it("keeps a whole variable's type for the families that read one", () => {
			expect(read("NumericEquals", "${principal.attributes.count}")?.decimal).toBeDefined();
			expect(read("NumericEquals", "${principal.attributes.text}")?.decimal).toBeDefined();
			expect(read("DateEquals", "${request.time}")?.date?.text).toBe("2024-06-01T00:00:00.000Z");
			expect(read("Bool", "${principal.attributes.flag}")?.isTrue).toBe(true);
		});

		it("reads a variable in a pattern as literal text: its `*` and `?` are no wildcards", () => {
			const context: Record<string, unknown> = { principal: { attributes: { value: "a*b?" }, id: "user-1", type: "user" } };
			const condition: IApiAuthorizationIamCondition = readCondition("StringLike", "${principal.attributes.value}-*", "principal.attributes.other");
			const operands: Array<IApiAuthorizationIamOperand> | undefined = ApiAuthorizationIamOperator.readOperands(condition, context);

			expect(operands).toBeDefined();
			expect(ApiAuthorizationIamOperator.evaluate(condition, "a*b?-x", operands as Array<IApiAuthorizationIamOperand>, false)).toBe(true);
			expect(ApiAuthorizationIamOperator.evaluate(condition, "axby-x", operands as Array<IApiAuthorizationIamOperand>, false)).toBe(false);
		});

		it("unmaps an address only when a variable names it, not when a document writes it", () => {
			expect(read("IpAddress", "${request.sourceIp}")?.network?.family).toBe(4);
			expect(read("IpAddress", "::ffff:10.0.0.1")?.network?.family).toBe(6);
		});
	});
});
