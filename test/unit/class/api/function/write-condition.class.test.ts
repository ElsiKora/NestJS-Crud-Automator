import type { FindOptionsWhere } from "typeorm";

import { ApiFunctionWriteCondition } from "@class/api/function/write-condition.class";
import { Equal, In } from "typeorm";
import { describe, expect, it } from "vitest";

interface IWriteConditionRow {
	id: string;
	operator?: { name: string };
	status: string;
}

const OWNER: string = "OrderService.update";

/**
 * Builds an open write condition of a function that runs in a transaction.
 * @returns {ApiFunctionWriteCondition<IWriteConditionRow>} The condition collector.
 */
function openCondition(): ApiFunctionWriteCondition<IWriteConditionRow> {
	return new ApiFunctionWriteCondition<IWriteConditionRow>(OWNER, true);
}

describe("ApiFunctionWriteCondition", () => {
	it("returns the scope itself while no condition was added", () => {
		const condition: ApiFunctionWriteCondition<IWriteConditionRow> = openCondition();
		const scope: FindOptionsWhere<IWriteConditionRow> = { id: "a" };

		expect(condition.hasConditions).toBe(false);
		expect(condition.apply(scope)).toBe(scope);
	});

	it("ANDs a condition into an object scope", () => {
		const condition: ApiFunctionWriteCondition<IWriteConditionRow> = openCondition();
		condition.add({ status: "open" });

		expect(condition.hasConditions).toBe(true);
		expect(condition.apply({ id: "a" })).toEqual({ id: Equal("a"), status: Equal("open") });
	});

	it("ANDs a condition into every branch of an array scope", () => {
		const condition: ApiFunctionWriteCondition<IWriteConditionRow> = openCondition();
		condition.add({ operator: { name: "First" } });

		expect(condition.apply([{ id: "a" }, { id: "b" }])).toEqual([
			{ id: Equal("a"), operator: { name: Equal("First") } },
			{ id: Equal("b"), operator: { name: Equal("First") } },
		]);
	});

	it("ANDs an array condition as an OR inside that condition only", () => {
		const condition: ApiFunctionWriteCondition<IWriteConditionRow> = openCondition();
		condition.add([{ status: "open" }, { status: "draft" }]);
		condition.add({ operator: { name: "First" } });

		expect(condition.apply({ id: "a" })).toEqual([
			{ id: Equal("a"), operator: { name: Equal("First") }, status: Equal("open") },
			{ id: Equal("a"), operator: { name: Equal("First") }, status: Equal("draft") },
		]);
	});

	it("never widens a scope that already pins the same column", () => {
		const condition: ApiFunctionWriteCondition<IWriteConditionRow> = openCondition();
		condition.add({ status: "open" });

		// Two different values of one column match no row, so the write finds nothing instead of either value.
		expect(condition.apply({ id: "a", status: "locked" })).toEqual({ id: Equal("a"), status: In([]) });
	});

	it("keeps a detached copy, so a later change to the given object does not change the condition", () => {
		const condition: ApiFunctionWriteCondition<IWriteConditionRow> = openCondition();
		const where: FindOptionsWhere<IWriteConditionRow> = { status: "open" };
		condition.add(where);
		where.status = "locked";

		expect(condition.apply({ id: "a" })).toEqual({ id: Equal("a"), status: Equal("open") });
	});

	it.each([
		["an empty object", {}],
		["an empty array", []],
		["an undefined value", { status: undefined }],
	])("refuses %s, which TypeORM would read as every row", (_case: string, where: unknown) => {
		const condition: ApiFunctionWriteCondition<IWriteConditionRow> = openCondition();

		expect(() => condition.add(where as FindOptionsWhere<IWriteConditionRow>)).toThrow("[NestJS-Crud-Automator]");
		expect(condition.hasConditions).toBe(false);
	});

	it("refuses a condition of a function that runs without a transaction, naming the function", () => {
		const condition: ApiFunctionWriteCondition<IWriteConditionRow> = new ApiFunctionWriteCondition<IWriteConditionRow>(OWNER, false);

		expect(() => condition.add({ status: "open" })).toThrow(`[NestJS-Crud-Automator] Function "${OWNER}" needs a transaction to add a write condition: configure its transaction mode as REQUIRED`);
		expect(condition.hasConditions).toBe(false);
	});

	it("refuses a condition after the BEFORE chain closed it, and keeps the earlier ones", () => {
		const condition: ApiFunctionWriteCondition<IWriteConditionRow> = openCondition();
		condition.add({ status: "open" });
		condition.close();

		expect(() => condition.add({ status: "draft" })).toThrow(`[NestJS-Crud-Automator] Function "${OWNER}" accepts write conditions only while its BEFORE subscribers run`);
		expect(condition.apply({ id: "a" })).toEqual({ id: Equal("a"), status: Equal("open") });
	});
});
