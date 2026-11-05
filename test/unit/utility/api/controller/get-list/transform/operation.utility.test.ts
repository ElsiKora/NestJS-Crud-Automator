import { EFilterOperation } from "@enum/filter";
import { ApiControllerGetListTransformOperation } from "@utility/api/controller/get-list/transform/operation.utility";
import { Equal, LessThan, MoreThan, Not } from "typeorm";
import { describe, expect, it } from "vitest";

describe("ApiControllerGetListTransformOperation", () => {
	it("keeps a boolean comparison operand a boolean and compares other scalars as text", () => {
		const instant: Date = new Date("2024-03-01T09:30:00.000Z");

		expect(ApiControllerGetListTransformOperation(EFilterOperation.EQ, true)).toEqual(Equal(true));
		expect(ApiControllerGetListTransformOperation(EFilterOperation.NE, false)).toEqual(Not(false));
		expect(ApiControllerGetListTransformOperation(EFilterOperation.EQ, 5)).toEqual(Equal("5"));
		expect(ApiControllerGetListTransformOperation(EFilterOperation.GT, instant)).toEqual(MoreThan(instant));
		expect(ApiControllerGetListTransformOperation(EFilterOperation.LT, 5)).toEqual(LessThan("5"));
	});

	it("builds filter operators for common operations", () => {
		const between = ApiControllerGetListTransformOperation(EFilterOperation.BETWEEN, [1, 10]) as { type?: string; value?: unknown };
		const equal = ApiControllerGetListTransformOperation(EFilterOperation.EQ, "value") as { type?: string; value?: unknown };
		const list = ApiControllerGetListTransformOperation(EFilterOperation.IN, ["a", "b"]) as { type?: string; value?: unknown };
		const isNull = ApiControllerGetListTransformOperation(EFilterOperation.ISNULL, null) as { type?: string; value?: unknown };

		expect(between).toHaveProperty("type");
		expect(equal.value).toBe("value");
		expect(list.value).toEqual(["a", "b"]);
		expect(isNull).toHaveProperty("type");
	});

	it("handles string comparison helpers", () => {
		const starts = ApiControllerGetListTransformOperation(EFilterOperation.STARTS, "prefix", "postgres") as { value?: string };
		const ends = ApiControllerGetListTransformOperation(EFilterOperation.ENDS, "suffix", "postgres") as { value?: string };
		const contains = ApiControllerGetListTransformOperation(EFilterOperation.CONT, "part", "postgres") as { value?: string };

		expect(starts.value).toContain("prefix");
		expect(ends.value).toContain("suffix");
		expect(contains.value).toContain("part");
	});

	it("covers remaining filter operations", () => {
		const contl = ApiControllerGetListTransformOperation(EFilterOperation.CONTL, "case", "postgres") as { type?: string; value?: string };
		const endsl = ApiControllerGetListTransformOperation(EFilterOperation.ENDSL, "case", "postgres") as { type?: string; value?: string };
		const eql = ApiControllerGetListTransformOperation(EFilterOperation.EQL, "value", "postgres") as { type?: string; value?: string };
		const excl = ApiControllerGetListTransformOperation(EFilterOperation.EXCL, "value", "postgres") as { type?: string; value?: unknown };
		const excll = ApiControllerGetListTransformOperation(EFilterOperation.EXCLL, "value", "postgres") as { type?: string; value?: unknown };
		const gt = ApiControllerGetListTransformOperation(EFilterOperation.GT, 5) as { type?: string; value?: unknown };
		const gte = ApiControllerGetListTransformOperation(EFilterOperation.GTE, 5) as { type?: string; value?: unknown };
		const inl = ApiControllerGetListTransformOperation(EFilterOperation.INL, ["a", "b"], "postgres") as { type?: string; value?: unknown };
		const lt = ApiControllerGetListTransformOperation(EFilterOperation.LT, 5) as { type?: string; value?: unknown };
		const lte = ApiControllerGetListTransformOperation(EFilterOperation.LTE, 5) as { type?: string; value?: unknown };
		const ne = ApiControllerGetListTransformOperation(EFilterOperation.NE, "value") as { type?: string; value?: unknown };
		const nel = ApiControllerGetListTransformOperation(EFilterOperation.NEL, "value", "postgres") as { type?: string; value?: unknown };
		const notIn = ApiControllerGetListTransformOperation(EFilterOperation.NOTIN, ["a"]) as { type?: string; value?: unknown };
		const notInl = ApiControllerGetListTransformOperation(EFilterOperation.NOTINL, ["a"], "postgres") as { type?: string; value?: unknown };
		const notNull = ApiControllerGetListTransformOperation(EFilterOperation.NOTNULL, null) as { type?: string; value?: unknown };
		const startsl = ApiControllerGetListTransformOperation(EFilterOperation.STARTSL, "case", "postgres") as { type?: string; value?: string };

		expect(contl.type).toBe("ilike");
		expect(endsl.type).toBe("ilike");
		expect(eql.type).toBe("ilike");
		expect(excl.type).toBe("not");
		expect(excll.type).toBe("not");
		expect(gt.type).toBe("moreThan");
		expect(gte.type).toBe("moreThanOrEqual");
		expect(inl.type).toBe("in");
		expect(lt.type).toBe("lessThan");
		expect(lte.type).toBe("lessThanOrEqual");
		expect(ne.type).toBe("not");
		expect(nel.type).toBe("not");
		expect(notIn.type).toBe("not");
		expect(notInl.type).toBe("not");
		expect(notNull.type).toBe("not");
		expect(startsl.type).toBe("ilike");
	});
});
