import type { IApiAuthorizationIamCollection, IApiAuthorizationIamPredicateColumn } from "@interface/class/api/authorization";
import type { TApiAuthorizationIamPredicate, TApiAuthorizationIamPredicateAtom } from "@type/class/api/authorization/iam";

import { ApiAuthorizationIamPredicateBuilder, ApiAuthorizationIamPredicateNormalForm } from "@class/api/authorization/iam";
import { EApiAuthorizationIamPredicateComparison, EApiAuthorizationIamPredicateKind } from "@enum/class/authorization";
import { createIamLowererColumn } from "@test/unit/class/api/authorization/iam/fixture/lowerer";
import { describe, expect, it } from "vitest";

const NAME: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("name");
const CODE: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("code");

const equals = (column: IApiAuthorizationIamPredicateColumn, value: string): TApiAuthorizationIamPredicateAtom => ({ column, comparison: EApiAuthorizationIamPredicateComparison.TEXT, isNegated: false, kind: EApiAuthorizationIamPredicateKind.IN, values: [value] });
const isNull = (column: IApiAuthorizationIamPredicateColumn): TApiAuthorizationIamPredicateAtom => ({ column, kind: EApiAuthorizationIamPredicateKind.IS_NULL });
const notNull = (column: IApiAuthorizationIamPredicateColumn): TApiAuthorizationIamPredicateAtom => ({ column, kind: EApiAuthorizationIamPredicateKind.NOT_NULL });

describe("ApiAuthorizationIamPredicateNormalForm", () => {
	it("reads TRUE as one empty branch and FALSE as none", () => {
		expect(ApiAuthorizationIamPredicateNormalForm.toBranches({ kind: EApiAuthorizationIamPredicateKind.TRUE }, 4)).toEqual([[]]);
		expect(ApiAuthorizationIamPredicateNormalForm.toBranches({ kind: EApiAuthorizationIamPredicateKind.FALSE }, 4)).toEqual([]);
	});

	it("distributes AND over OR in order", () => {
		const predicate: TApiAuthorizationIamPredicate = ApiAuthorizationIamPredicateBuilder.and([ApiAuthorizationIamPredicateBuilder.or([equals(NAME, "a"), isNull(NAME)]), ApiAuthorizationIamPredicateBuilder.or([equals(CODE, "x"), isNull(CODE)])]);

		expect(ApiAuthorizationIamPredicateNormalForm.toBranches(predicate, 4)).toEqual([
			[equals(NAME, "a"), equals(CODE, "x")],
			[equals(NAME, "a"), isNull(CODE)],
			[isNull(NAME), equals(CODE, "x")],
			[isNull(NAME), isNull(CODE)],
		]);
	});

	it("stops before a product or a sum exceeds the cap", () => {
		const pair: TApiAuthorizationIamPredicate = ApiAuthorizationIamPredicateBuilder.or([equals(NAME, "a"), isNull(NAME)]);

		expect(ApiAuthorizationIamPredicateNormalForm.toBranches(ApiAuthorizationIamPredicateBuilder.and([pair, ApiAuthorizationIamPredicateBuilder.or([equals(CODE, "x"), isNull(CODE)])]), 3)).toBeUndefined();
		expect(ApiAuthorizationIamPredicateNormalForm.toBranches(ApiAuthorizationIamPredicateBuilder.or([pair, equals(CODE, "x")]), 2)).toBeUndefined();
		expect(ApiAuthorizationIamPredicateNormalForm.toBranches(ApiAuthorizationIamPredicateBuilder.or([pair, equals(CODE, "x")]), 3)).toHaveLength(3);
	});

	it("keeps a repeated atom once and drops a branch that needs a column NULL and not NULL", () => {
		const predicate: TApiAuthorizationIamPredicate = ApiAuthorizationIamPredicateBuilder.or([ApiAuthorizationIamPredicateBuilder.and([equals(NAME, "a"), equals(NAME, "a")]), ApiAuthorizationIamPredicateBuilder.and([isNull(NAME), notNull(NAME)])]);

		expect(ApiAuthorizationIamPredicateNormalForm.toBranches(predicate, 4)).toEqual([[equals(NAME, "a")]]);
	});

	it("keeps an EXISTS atom whole, and tells it apart by negation, relation, column and related predicate", () => {
		const collection: IApiAuthorizationIamCollection = { correlationPath: "id", element: "row.text", elementPath: "text", from: "notes row", link: "row.itemId" };
		const exists: TApiAuthorizationIamPredicateAtom = { collection, column: NAME, isNegated: false, kind: EApiAuthorizationIamPredicateKind.EXISTS, predicate: ApiAuthorizationIamPredicateBuilder.or([equals(CODE, "a"), isNull(CODE)]) };
		const atoms: Array<TApiAuthorizationIamPredicateAtom> = [
			exists,
			{ ...exists, isNegated: true } as TApiAuthorizationIamPredicateAtom,
			{ ...exists, collection: { ...collection, from: "tags row" } } as TApiAuthorizationIamPredicateAtom,
			{ ...exists, collection: { ...collection, element: "row.other" } } as TApiAuthorizationIamPredicateAtom,
			{ ...exists, column: CODE } as TApiAuthorizationIamPredicateAtom,
			{ ...exists, predicate: equals(CODE, "a") } as TApiAuthorizationIamPredicateAtom,
		];

		expect(ApiAuthorizationIamPredicateNormalForm.toBranches(exists, 1)).toEqual([[exists]]);
		expect(ApiAuthorizationIamPredicateNormalForm.toBranches(ApiAuthorizationIamPredicateBuilder.and([exists, exists]), 1)).toEqual([[exists]]);
		expect(new Set<string>(atoms.map((atom: TApiAuthorizationIamPredicateAtom): string => ApiAuthorizationIamPredicateNormalForm.readAtomKey(atom))).size).toBe(atoms.length);
	});

	it("tells atoms apart by kind, path, comparison, negation and values", () => {
		const atoms: Array<TApiAuthorizationIamPredicateAtom> = [equals(NAME, "a"), equals(NAME, "b"), equals(CODE, "a"), { ...equals(NAME, "a"), isNegated: true } as TApiAuthorizationIamPredicateAtom, { ...equals(NAME, "a"), comparison: EApiAuthorizationIamPredicateComparison.NATIVE } as TApiAuthorizationIamPredicateAtom, isNull(NAME), notNull(NAME)];

		expect(new Set<string>(atoms.map((atom: TApiAuthorizationIamPredicateAtom): string => ApiAuthorizationIamPredicateNormalForm.readAtomKey(atom))).size).toBe(atoms.length);
	});
});
