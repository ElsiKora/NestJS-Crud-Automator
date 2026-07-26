import type { IApiControllerGetListQueryOperator } from "@interface/class/api/controller/get-list/query";

import { FILTER_OPERATOR_REGISTRY_CONSTANT } from "@constant/filter";
import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { EFilterOperand, EFilterOperation } from "@enum/filter";
import { describe, expect, it } from "vitest";

describe("FILTER_OPERATOR_REGISTRY_CONSTANT", () => {
	it("defines one descriptor for every public operation", () => {
		expect(Object.keys(FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS).toSorted()).toEqual(Object.values(EFilterOperation).toSorted());
		expect(Object.isFrozen(FILTER_OPERATOR_REGISTRY_CONSTANT)).toBe(true);
		expect(Object.isFrozen(FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS)).toBe(true);
		expect(Object.values(FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS).every((descriptor: IApiControllerGetListQueryOperator): boolean => Object.isFrozen(descriptor) && Object.isFrozen(descriptor.kinds))).toBe(true);
	});

	it("owns exact operand cardinality categories", () => {
		expect(FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[EFilterOperation.EQ].operand).toBe(EFilterOperand.VALUE);
		expect(FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[EFilterOperation.EXCL].operand).toBe(EFilterOperand.VALUES);
		expect(FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[EFilterOperation.IN].operand).toBe(EFilterOperand.VALUES);
		expect(FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[EFilterOperation.BETWEEN].operand).toBe(EFilterOperand.PAIR);
		expect(FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[EFilterOperation.ISNULL].operand).toBe(EFilterOperand.NONE);
	});

	it("owns operation applicability by metadata kind", () => {
		expect(FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[EFilterOperation.CONT].kinds).toEqual([EApiPropertyDescribeType.STRING]);
		expect(FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[EFilterOperation.GT].kinds).toEqual([EApiPropertyDescribeType.DATE, EApiPropertyDescribeType.NUMBER]);
		expect(FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[EFilterOperation.EQ].kinds).toEqual(expect.arrayContaining([EApiPropertyDescribeType.BOOLEAN, EApiPropertyDescribeType.DATE, EApiPropertyDescribeType.NUMBER, EApiPropertyDescribeType.STRING, EApiPropertyDescribeType.UUID]));
	});

	it("preserves typed scalar and date operands in TypeORM operators", () => {
		const numberOperator = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[EFilterOperation.EQ].compile(7);
		const booleanOperator = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[EFilterOperation.EQ].compile(false);
		const from = new Date("2026-01-01T00:00:00.000Z");
		const to = new Date("2026-02-01T00:00:00.000Z");
		const dateOperator = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[EFilterOperation.BETWEEN].compile([from, to]);

		expect(numberOperator.value).toBe(7);
		expect(booleanOperator.value).toBe(false);
		expect(dateOperator.value).toEqual([from, to]);
	});

	it("compiles case-insensitive membership as predicate composition", () => {
		const include = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[EFilterOperation.INL].compile(["Alpha", "Beta"]);
		const exclude = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[EFilterOperation.NOTINL].compile(["Alpha", "Beta"]);

		expect(include.type).toBe("or");
		expect(include.value).toHaveLength(2);
		expect(exclude.type).toBe("not");
		expect(exclude.child?.type).toBe("or");
	});
});
