import type { IApiAuthorizationIamCollection, IApiAuthorizationIamCondition, IApiAuthorizationIamNetwork, IApiAuthorizationIamOperand, IApiAuthorizationIamPredicateColumn, IApiAuthorizationIamPredicatePair, IApiAuthorizationIamToken } from "@interface/class/api/authorization";
import type { TApiAuthorizationIamPredicate } from "@type/class/api/authorization/iam";

import { ApiAuthorizationIamDecimal, ApiAuthorizationIamGlob, ApiAuthorizationIamNetwork, ApiAuthorizationIamOperator, ApiAuthorizationIamParser, ApiAuthorizationIamPredicateBuilder, ApiAuthorizationIamQueryPlanner } from "@class/api/authorization/iam";
import { EApiAuthorizationIamColumnFamily, EApiAuthorizationIamPredicateComparison, EApiAuthorizationIamPredicateKind, EApiAuthorizationIamPredicateOperator, EApiAuthorizationIamTokenType, EApiPolicyConditionOperator, EApiPolicyConditionOperatorFamily, EApiPolicyConditionQualifier } from "@enum/class/authorization";
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

		case EApiAuthorizationIamPredicateKind.ARN: {
			const value: null | string | undefined = row[predicate.column.queryPath];

			return value === null || value === undefined ? undefined : ApiAuthorizationIamGlob.isSegmentMatched(predicate.pattern, value) !== predicate.isNegated;
		}

		case EApiAuthorizationIamPredicateKind.COMPARE: {
			const value: null | string | undefined = row[predicate.column.queryPath];

			if (value === null || value === undefined) {
				return undefined;
			}

			const order: number = predicate.comparison === EApiAuthorizationIamPredicateComparison.DATE ? Math.sign(Date.parse(value) - Date.parse(predicate.value)) : ApiAuthorizationIamDecimal.compare(ApiAuthorizationIamDecimal.parse(value) ?? { scale: 0, unscaled: 0n }, ApiAuthorizationIamDecimal.parse(predicate.value) ?? { scale: 0, unscaled: 0n });

			switch (predicate.operator) {
				case EApiAuthorizationIamPredicateOperator.EQUAL: {
					return order === 0;
				}

				case EApiAuthorizationIamPredicateOperator.GREATER_THAN: {
					return order > 0;
				}

				case EApiAuthorizationIamPredicateOperator.GREATER_THAN_EQUAL: {
					return order >= 0;
				}

				case EApiAuthorizationIamPredicateOperator.LESS_THAN: {
					return order < 0;
				}

				case EApiAuthorizationIamPredicateOperator.LESS_THAN_EQUAL: {
					return order <= 0;
				}

				case EApiAuthorizationIamPredicateOperator.NOT_EQUAL: {
					return order !== 0;
				}
			}

			break;
		}

		case EApiAuthorizationIamPredicateKind.FALSE: {
			return false;
		}

		case EApiAuthorizationIamPredicateKind.IN: {
			const value: null | string | undefined = row[predicate.column.queryPath];

			if (value === null || value === undefined) {
				return undefined;
			}

			if (predicate.comparison === EApiAuthorizationIamPredicateComparison.TEXT_IGNORE_CASE) {
				return predicate.values.includes(ApiAuthorizationIamOperator.foldCase(value)) !== predicate.isNegated;
			}

			if (predicate.comparison === EApiAuthorizationIamPredicateComparison.BOOLEAN) {
				return predicate.values.includes(value === "true") !== predicate.isNegated;
			}

			return predicate.values.includes(value) !== predicate.isNegated;
		}

		case EApiAuthorizationIamPredicateKind.IP_CONTAINED: {
			const value: null | string | undefined = row[predicate.column.queryPath];
			const range: IApiAuthorizationIamNetwork | undefined = ApiAuthorizationIamNetwork.parse(predicate.range);
			const network: IApiAuthorizationIamNetwork | undefined = ApiAuthorizationIamNetwork.parse(value ?? "");

			return !range || !network ? undefined : ApiAuthorizationIamNetwork.isContained(range, network) !== predicate.isNegated;
		}

		case EApiAuthorizationIamPredicateKind.IS_NULL: {
			return (row[predicate.column.queryPath] ?? null) === null;
		}

		case EApiAuthorizationIamPredicateKind.LIKE: {
			const value: null | string | undefined = row[predicate.column.queryPath];

			return value === null || value === undefined ? undefined : ApiAuthorizationIamGlob.isMatched(predicate.pattern, value) !== predicate.isNegated;
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

// One operator family: its column, its positive and negated operators, the operand, and the non-NULL values a row may hold.
interface IOperatorCase {
	family: EApiAuthorizationIamColumnFamily;
	operators: ReadonlyArray<string>;
	operand: string;
	type?: string;
	values: ReadonlyArray<string>;
}

const OPERATOR_CASES: ReadonlyArray<IOperatorCase> = [
	{ family: EApiAuthorizationIamColumnFamily.TEXT, operand: "ann", operators: ["StringEquals", "StringNotEquals"], values: ["", "ann", "ANN", "bob"] },
	{ family: EApiAuthorizationIamColumnFamily.TEXT, operand: "AnN", operators: ["StringEqualsIgnoreCase", "StringNotEqualsIgnoreCase"], values: ["", "ann", "ANN", "bob", "ÀNN"] },
	{ family: EApiAuthorizationIamColumnFamily.TEXT, operand: "a*", operators: ["StringLike", "StringNotLike"], values: ["", "a", "ann", "bob"] },
	{ family: EApiAuthorizationIamColumnFamily.TEXT, operand: "*", operators: ["StringLike", "StringNotLike"], values: ["", "ann"] },
	{ family: EApiAuthorizationIamColumnFamily.TEXT, operand: "arn:aws:s3:*:bucket", operators: ["ArnEquals", "ArnNotEquals", "ArnLike", "ArnNotLike"], values: ["", "arn:aws:s3:eu:bucket", "arn:aws:s3:eu:x:bucket", "arn:aws:s3::bucket", "bucket"] },
	{ family: EApiAuthorizationIamColumnFamily.NUMERIC, operand: "10", operators: ["NumericEquals", "NumericNotEquals", "NumericLessThan", "NumericLessThanEquals", "NumericGreaterThan", "NumericGreaterThanEquals"], type: "numeric", values: ["9", "10", "10.0", "10.5", "11", "-10"] },
	{ family: EApiAuthorizationIamColumnFamily.DATE, operand: "2024-01-01T10:00:00.000Z", operators: ["DateEquals", "DateNotEquals", "DateLessThan", "DateLessThanEquals", "DateGreaterThan", "DateGreaterThanEquals"], type: "timestamptz", values: ["2024-01-01T09:59:59.999Z", "2024-01-01T10:00:00.000Z", "2024-01-01T12:00:00.000+02:00", "2024-01-01T10:00:00.001Z"] },
	{ family: EApiAuthorizationIamColumnFamily.DATE, operand: "2024-01-02", operators: ["DateEquals", "DateNotEquals", "DateLessThan", "DateGreaterThanEquals"], type: "date", values: ["2024-01-01", "2024-01-02", "2024-01-03"] },
	{ family: EApiAuthorizationIamColumnFamily.BOOLEAN, operand: "true", operators: ["Bool"], type: "boolean", values: ["true", "false"] },
	{ family: EApiAuthorizationIamColumnFamily.NETWORK, operand: "10.0.0.0/8", operators: ["IpAddress", "NotIpAddress"], type: "inet", values: ["10.1.2.3", "11.0.0.1", "::ffff:10.1.2.3", "2001:db8::1", "10.0.0.0/8", "10.0.0.0/7"] },
];

/**
 * Reads one condition key the way the grammar reads it.
 * @param {string} operator - Operator as written.
 * @param {string} operand - Value as written.
 * @returns {IApiAuthorizationIamCondition} The condition key.
 */
function readCondition(operator: string, operand: string): IApiAuthorizationIamCondition {
	const condition: IApiAuthorizationIamCondition | undefined = ApiAuthorizationIamParser.readStatement({ Action: ["a:*"], Condition: { [operator]: { "principal.id": operand } }, Effect: "Allow", Resource: ["*"] }).conditions[0];

	if (!condition) {
		throw new Error(`The grammar read no condition for ${operator}`);
	}

	return condition;
}

/**
 * Reads one condition key with several values the way the grammar reads it.
 * @param {string} operator - Operator as written.
 * @param {ReadonlyArray<string>} operands - Values as written.
 * @returns {IApiAuthorizationIamCondition} The condition key.
 */
function readConditionValues(operator: string, operands: ReadonlyArray<string>): IApiAuthorizationIamCondition {
	const condition: IApiAuthorizationIamCondition | undefined = ApiAuthorizationIamParser.readStatement({ Action: ["a:*"], Condition: { [operator]: { "principal.id": operands } }, Effect: "Allow", Resource: ["*"] }).conditions[0];

	if (!condition) {
		throw new Error(`The grammar read no condition for ${operator}`);
	}

	return condition;
}

const COLLECTION: IApiAuthorizationIamCollection = { correlationPath: "id", element: `"row"."text"`, elementPath: "text", from: `"notes" "row"`, link: `"row"."itemId"` };
const ROW_ID: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("id", { isPrimary: true });
const ELEMENT: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("text");
const ELEMENT_IN: TApiAuthorizationIamPredicate = { column: ELEMENT, comparison: EApiAuthorizationIamPredicateComparison.TEXT, isNegated: false, kind: EApiAuthorizationIamPredicateKind.IN, values: ["a"] };
const ELEMENT_NOT_IN: TApiAuthorizationIamPredicate = { column: ELEMENT, comparison: EApiAuthorizationIamPredicateComparison.TEXT, isNegated: true, kind: EApiAuthorizationIamPredicateKind.IN, values: ["a"] };
const ELEMENT_PAIR: IApiAuthorizationIamPredicatePair = { fails: ELEMENT_NOT_IN, holds: ELEMENT_IN };

const exists = (predicate: TApiAuthorizationIamPredicate, isNegated: boolean): TApiAuthorizationIamPredicate => ({ collection: COLLECTION, column: ROW_ID, isNegated, kind: EApiAuthorizationIamPredicateKind.EXISTS, predicate });

const qualified = (qualifier: EApiPolicyConditionQualifier, isIfExists: boolean = false, element: IApiAuthorizationIamPredicatePair = ELEMENT_PAIR): IApiAuthorizationIamPredicatePair => ApiAuthorizationIamPredicateBuilder.buildQualified({ collection: COLLECTION, column: ROW_ID, condition: { ...createCondition(false, isIfExists), qualifier }, element });

describe("ApiAuthorizationIamPredicateBuilder", () => {
	describe("set qualifiers on a to-many relation", () => {
		const EVERY_ROW: TApiAuthorizationIamPredicate = { kind: EApiAuthorizationIamPredicateKind.TRUE };

		it("reads ForAnyValue as a related row that holds", () => {
			expect(qualified(EApiPolicyConditionQualifier.FOR_ANY_VALUE)).toEqual({ fails: exists(ELEMENT_IN, true), holds: exists(ELEMENT_IN, false) });
		});

		it("reads ForAllValues as no related row that fails, so no related row holds it", () => {
			expect(qualified(EApiPolicyConditionQualifier.FOR_ALL_VALUES)).toEqual({ fails: exists(ELEMENT_NOT_IN, false), holds: exists(ELEMENT_NOT_IN, true) });
		});

		it("adds the rows with no related row to ForAnyValue with IfExists", () => {
			expect(qualified(EApiPolicyConditionQualifier.FOR_ANY_VALUE, true)).toEqual({
				fails: { children: [exists(ELEMENT_IN, true), exists(EVERY_ROW, false)], kind: EApiAuthorizationIamPredicateKind.AND },
				holds: { children: [exists(ELEMENT_IN, false), exists(EVERY_ROW, true)], kind: EApiAuthorizationIamPredicateKind.OR },
			});
		});

		it("changes nothing for ForAllValues with IfExists", () => {
			expect(qualified(EApiPolicyConditionQualifier.FOR_ALL_VALUES, true)).toEqual(qualified(EApiPolicyConditionQualifier.FOR_ALL_VALUES));
		});

		it("folds an element no related row can hold", () => {
			const never: IApiAuthorizationIamPredicatePair = { fails: EVERY_ROW, holds: { kind: EApiAuthorizationIamPredicateKind.FALSE } };

			expect(qualified(EApiPolicyConditionQualifier.FOR_ANY_VALUE, false, never)).toEqual({ fails: EVERY_ROW, holds: { kind: EApiAuthorizationIamPredicateKind.FALSE } });
			expect(qualified(EApiPolicyConditionQualifier.FOR_ALL_VALUES, false, { fails: { kind: EApiAuthorizationIamPredicateKind.FALSE }, holds: EVERY_ROW })).toEqual({ fails: { kind: EApiAuthorizationIamPredicateKind.FALSE }, holds: EVERY_ROW });
		});
	});

	describe("complementarity over every operator family", () => {
		const planner: ApiAuthorizationIamQueryPlanner = new ApiAuthorizationIamQueryPlanner();

		const operators: Array<[string, string, IOperatorCase]> = OPERATOR_CASES.flatMap((operatorCase: IOperatorCase): Array<[string, string, IOperatorCase]> => operatorCase.operators.flatMap((operator: string): Array<[string, string, IOperatorCase]> => [`${operator}`, `${operator}IfExists`].map((name: string): [string, string, IOperatorCase] => [name, operatorCase.operand, operatorCase])));

		it.each(operators)("%s %s: holds XOR fails on every row, and holds equals memory", (operator: string, operand: string, operatorCase: IOperatorCase) => {
			const condition: IApiAuthorizationIamCondition = readCondition(operator, operand);
			const memoryOperands: Array<IApiAuthorizationIamOperand> | undefined = ApiAuthorizationIamOperator.readOperands(condition, {});
			const shape: { family: EApiAuthorizationIamColumnFamily; type?: string } = operatorCase.type === undefined ? { family: operatorCase.family } : { family: operatorCase.family, type: operatorCase.type };
			const rootColumn: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("code", shape);
			const optionalColumn: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("owner.code", shape, { isBoolean: operatorCase.family === EApiAuthorizationIamColumnFamily.BOOLEAN, isOptional: true, presencePath: "owner.id" });
			const rootField: IApiAuthorizationIamPredicateColumn = operatorCase.family === EApiAuthorizationIamColumnFamily.BOOLEAN ? createIamLowererColumn("code", shape, { isBoolean: true }) : rootColumn;

			expect(memoryOperands).toBeDefined();

			for (const [column, presence, missing] of [
				[rootField, undefined, false],
				[optionalColumn, PRESENCE, true],
			] as Array<[IApiAuthorizationIamPredicateColumn, IApiAuthorizationIamPredicateColumn | undefined, boolean]>) {
				const pair: IApiAuthorizationIamPredicatePair | undefined = planner["buildOperandPair"](condition, memoryOperands ?? [], column, presence);

				expect(pair).toBeDefined();

				const rows: Array<{ actual: null | string | undefined; row: TRow }> = [{ actual: null, row: { [column.queryPath]: null, "owner.id": "o1" } }, ...operatorCase.values.map((value: string): { actual: string; row: TRow } => ({ actual: value, row: { [column.queryPath]: value, "owner.id": "o1" } }))];

				if (missing) {
					rows.push({ actual: undefined, row: { [column.queryPath]: null, "owner.id": null } });
				}

				for (const { actual, row } of rows) {
					const expected: boolean | undefined = ApiAuthorizationIamOperator.evaluate(condition, actual, memoryOperands ?? [], true);

					expect({ fails: isSelected(pair?.fails ?? { kind: EApiAuthorizationIamPredicateKind.FALSE }, row), holds: isSelected(pair?.holds ?? { kind: EApiAuthorizationIamPredicateKind.FALSE }, row), row }).toEqual({ fails: expected !== true, holds: expected === true, row });
				}
			}
		});

		// One family per row: the operators, two values, and the non-NULL values a row may hold.
		it.each<[string, EApiAuthorizationIamColumnFamily, string | undefined, ReadonlyArray<string>, [string, string], ReadonlyArray<string>]>([
			["String", EApiAuthorizationIamColumnFamily.TEXT, undefined, ["StringEquals", "StringNotEquals"], ["ann", "bob"], ["", "ann", "bob", "eve"]],
			["IgnoreCase", EApiAuthorizationIamColumnFamily.TEXT, undefined, ["StringEqualsIgnoreCase", "StringNotEqualsIgnoreCase"], ["AnN", "BoB"], ["", "ann", "BOB", "eve"]],
			["StringLike", EApiAuthorizationIamColumnFamily.TEXT, undefined, ["StringLike", "StringNotLike"], ["a*", "b?b"], ["", "ann", "bob", "bb", "eve"]],
			["StringLike matching an empty text", EApiAuthorizationIamColumnFamily.TEXT, undefined, ["StringLike", "StringNotLike"], ["a*", "*"], ["", "ann", "eve"]],
			["Arn", EApiAuthorizationIamColumnFamily.TEXT, undefined, ["ArnLike", "ArnNotLike"], ["a:*", "b:c"], ["", "a:b", "b:c", "b:d"]],
			["Numeric", EApiAuthorizationIamColumnFamily.NUMERIC, "numeric", ["NumericEquals", "NumericNotEquals", "NumericLessThan", "NumericGreaterThanEquals"], ["1", "5"], ["0", "1", "3", "5", "7"]],
			["Date", EApiAuthorizationIamColumnFamily.DATE, "timestamptz", ["DateEquals", "DateNotEquals", "DateGreaterThan", "DateLessThanEquals"], ["2024-01-01T00:00:00.000Z", "2024-02-01T00:00:00.000Z"], ["2023-12-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z", "2024-01-15T00:00:00.000Z", "2024-02-01T00:00:00.000Z", "2024-03-01T00:00:00.000Z"]],
			["IP", EApiAuthorizationIamColumnFamily.NETWORK, "inet", ["IpAddress", "NotIpAddress"], ["10.0.0.0/8", "192.168.0.0/16"], ["10.1.2.3", "192.168.1.1", "11.0.0.1"]],
		])("%s with two values: holds XOR fails on every row, and holds equals memory", (_name: string, family: EApiAuthorizationIamColumnFamily, type: string | undefined, conditionOperators: ReadonlyArray<string>, values: [string, string], rowValues: ReadonlyArray<string>) => {
			const shape: { family: EApiAuthorizationIamColumnFamily; type?: string } = type === undefined ? { family } : { family, type };

			for (const operator of conditionOperators.flatMap((name: string): Array<string> => [name, `${name}IfExists`])) {
				const condition: IApiAuthorizationIamCondition = readConditionValues(operator, values);
				const operands: Array<IApiAuthorizationIamOperand> | undefined = ApiAuthorizationIamOperator.readOperands(condition, {});

				for (const [column, presence, isOptional] of [
					[createIamLowererColumn("code", shape), undefined, false],
					[createIamLowererColumn("owner.code", shape, { isOptional: true, presencePath: "owner.id" }), PRESENCE, true],
				] as Array<[IApiAuthorizationIamPredicateColumn, IApiAuthorizationIamPredicateColumn | undefined, boolean]>) {
					const pair: IApiAuthorizationIamPredicatePair | undefined = new ApiAuthorizationIamQueryPlanner()["buildOperandPair"](condition, operands ?? [], column, presence);
					const rows: Array<{ actual: null | string | undefined; row: TRow }> = [{ actual: null, row: { [column.queryPath]: null, "owner.id": "o1" } }, ...rowValues.map((value: string): { actual: string; row: TRow } => ({ actual: value, row: { [column.queryPath]: value, "owner.id": "o1" } })), ...(isOptional ? [{ actual: undefined, row: { [column.queryPath]: null, "owner.id": null } }] : [])];

					expect(pair).toBeDefined();

					for (const { actual, row } of rows) {
						const expected: boolean | undefined = ApiAuthorizationIamOperator.evaluate(condition, actual, operands ?? [], true);

						expect({ fails: isSelected(pair?.fails ?? { kind: EApiAuthorizationIamPredicateKind.FALSE }, row), holds: isSelected(pair?.holds ?? { kind: EApiAuthorizationIamPredicateKind.FALSE }, row), operator, row }).toEqual({ fails: expected !== true, holds: expected === true, operator, row });
					}
				}
			}
		});

		it("Bool with both values holds on every value but NULL, in one IN", () => {
			const condition: IApiAuthorizationIamCondition = readConditionValues("Bool", ["true", "false"]);
			const pair: IApiAuthorizationIamPredicatePair | undefined = ApiAuthorizationIamPredicateBuilder.buildCondition({ column: NAME, comparison: EApiAuthorizationIamPredicateComparison.BOOLEAN, condition, values: [true, false] });

			expect(pair?.holds).toEqual({ column: NAME, comparison: EApiAuthorizationIamPredicateComparison.BOOLEAN, isNegated: false, kind: EApiAuthorizationIamPredicateKind.IN, values: [true, false] });
		});

		it("Null with both answers holds on every row and fails on none", () => {
			const pair: IApiAuthorizationIamPredicatePair = ApiAuthorizationIamPredicateBuilder.buildNull({ answers: [true, false], column: NAME });

			expect(isSelected(pair.holds, { "owner.name": null })).toBe(true);
			expect(isSelected(pair.holds, { "owner.name": "ann" })).toBe(true);
			expect(isSelected(pair.fails, { "owner.name": null })).toBe(false);
			expect(isSelected(pair.fails, { "owner.name": "ann" })).toBe(false);
		});

		it.each([
			["true", [true, false, false]],
			["false", [false, true, true]],
		])("Null %s holds XOR fails, with a missing value as NULL", (operand: string, expected: Array<boolean>) => {
			const pair: IApiAuthorizationIamPredicatePair = ApiAuthorizationIamPredicateBuilder.buildNull({ answers: [operand === "true"], column: NAME });
			const rows: Array<TRow> = [
				{ "owner.id": null, "owner.name": null },
				{ "owner.id": "o1", "owner.name": "ann" },
				{ "owner.id": "o1", "owner.name": "" },
			];

			expect(rows.map((row: TRow): boolean => isSelected(pair.holds, row))).toEqual(expected);
			expect(rows.map((row: TRow): boolean => isSelected(pair.fails, row))).toEqual(expected.map((isHeld: boolean): boolean => !isHeld));
		});
	});

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
		const RANK: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("rank", { family: EApiAuthorizationIamColumnFamily.NUMERIC, type: "int" });

		it.each([
			["a value on a text column", EApiAuthorizationIamPredicateComparison.TEXT, "x", [null, "", "x", "y"], [false, false, true, false]],
			["the empty value on a text column, which a NULL renders as", EApiAuthorizationIamPredicateComparison.TEXT, "", [null, "", "x"], [true, true, false]],
			["the empty value on a numeric column, which only a NULL renders as", EApiAuthorizationIamPredicateComparison.NATIVE, "", [null, "7"], [true, false]],
		])("splits every row for %s", (_name: string, comparison: EApiAuthorizationIamPredicateComparison, value: string, values: Array<null | string>, expected: Array<boolean>) => {
			const pair: IApiAuthorizationIamPredicatePair = ApiAuthorizationIamPredicateBuilder.buildExactConstraint({ column: CODE, comparison, value });

			expect(values.map((code: null | string): Array<boolean> => [isSelected(pair.holds, { code }), isSelected(pair.fails, { code })])).toEqual(expected.map((isHeld: boolean): Array<boolean> => [isHeld, !isHeld]));
		});

		it("splits every row for a prefix, which a NULL never starts", () => {
			const pair: IApiAuthorizationIamPredicatePair = ApiAuthorizationIamPredicateBuilder.buildPatternConstraint({ column: CODE, pattern: [{ type: EApiAuthorizationIamTokenType.LITERAL, value: "ab" }, { type: EApiAuthorizationIamTokenType.STAR }] });

			expect(pair.holds).toEqual({ column: CODE, isNegated: false, kind: EApiAuthorizationIamPredicateKind.LIKE, pattern: [{ type: EApiAuthorizationIamTokenType.LITERAL, value: "ab" }, { type: EApiAuthorizationIamTokenType.STAR }] });
			expect([null, "", "ab", "abc", "b"].map((code: null | string): Array<boolean> => [isSelected(pair.holds, { code }), isSelected(pair.fails, { code })])).toEqual([
				[false, true],
				[false, true],
				[true, false],
				[true, false],
				[false, true],
			]);
		});

		it("holds for every row with a pattern of wildcards alone", () => {
			expect(ApiAuthorizationIamPredicateBuilder.buildPatternConstraint({ column: CODE, pattern: [{ type: EApiAuthorizationIamTokenType.STAR }] })).toEqual({ fails: { kind: EApiAuthorizationIamPredicateKind.FALSE }, holds: { kind: EApiAuthorizationIamPredicateKind.TRUE } });
		});

		it.each([
			["a suffix", [{ type: EApiAuthorizationIamTokenType.STAR }, { type: EApiAuthorizationIamTokenType.LITERAL, value: "ab" }], [null, "", "ab", "xab", "abx"], [false, false, true, true, false]],
			["one character", [{ type: EApiAuthorizationIamTokenType.LITERAL, value: "a" }, { type: EApiAuthorizationIamTokenType.QUESTION_MARK }], [null, "", "a", "ab", "abc"], [false, false, false, true, false]],
		] as Array<[string, Array<IApiAuthorizationIamToken>, Array<null | string>, Array<boolean>]>)("splits every row for %s, which a NULL never matches", (_name: string, pattern: Array<IApiAuthorizationIamToken>, values: Array<null | string>, expected: Array<boolean>) => {
			const pair: IApiAuthorizationIamPredicatePair = ApiAuthorizationIamPredicateBuilder.buildPatternConstraint({ column: CODE, pattern });

			expect(values.map((code: null | string): Array<boolean> => [isSelected(pair.holds, { code }), isSelected(pair.fails, { code })])).toEqual(expected.map((isHeld: boolean): Array<boolean> => [isHeld, !isHeld]));
		});

		it("splits every row for a canonical integer, which a NULL never renders", () => {
			const pair: IApiAuthorizationIamPredicatePair = ApiAuthorizationIamPredicateBuilder.buildIntegerConstraint({ column: RANK, value: "7" });

			expect([null, "7", "8", "-7"].map((rank: null | string): Array<boolean> => [isSelected(pair.holds, { rank }), isSelected(pair.fails, { rank })])).toEqual([
				[false, true],
				[true, false],
				[false, true],
				[false, true],
			]);
		});

		it.each(["07", "-0", "+7", "7.0", "1e3", "abc", " 7"])("holds for no row with %j, which no integer renders as", (value: string) => {
			expect(ApiAuthorizationIamPredicateBuilder.buildIntegerConstraint({ column: RANK, value })).toEqual({ fails: { kind: EApiAuthorizationIamPredicateKind.TRUE }, holds: { kind: EApiAuthorizationIamPredicateKind.FALSE } });
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
