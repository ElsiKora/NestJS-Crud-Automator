import type { FindOperator, Repository, ValueTransformer } from "typeorm";
import type { Mock } from "vitest";

import { ApiControllerGeneratedCreateIdentityContract } from "@class/api/controller/generated/create-identity-contract.class";
import { ApiFunctionBoundOperator } from "@class/api/function/bound-operator.class";
import { describe, expect, it, vi } from "vitest";

interface IIdentityColumn {
	propertyName: string;
	transformer?: ValueTransformer;
	type: string;
}

const AT: Date = new Date("2024-01-02T03:04:05.678Z");

function createRepository(column: IIdentityColumn, driverType: string, count: number = 1): { count: Mock<() => Promise<number>>; repository: Repository<object> } {
	const countRows: Mock<() => Promise<number>> = vi.fn(async (): Promise<number> => count);

	return {
		count: countRows,
		repository: {
			count: countRows,
			manager: { dataSource: { driver: { normalizeType: (target: IIdentityColumn): string => target.type }, options: { type: driverType } } },
			metadata: { primaryColumns: [column] },
		} as unknown as Repository<object>,
	};
}

async function readCondition(column: IIdentityColumn, driverType: string, value: unknown = AT): Promise<FindOperator<unknown>> {
	const { repository } = createRepository(column, driverType);
	const identity: Record<string, unknown> = (await ApiControllerGeneratedCreateIdentityContract.identify(repository, { at: value })) as Record<string, unknown>;

	return identity.at as FindOperator<unknown>;
}

describe("ApiControllerGeneratedCreateIdentityContract", () => {
	describe("identify", () => {
		it.each([
			["an instant on postgres", { propertyName: "at", type: "timestamp with time zone" }, "postgres", ["2024-01-02T03:04:05.678Z", "2024-01-02T03:04:05.679Z"]],
			["an instant on cockroachdb", { propertyName: "at", type: "timestamptz" }, "cockroachdb", ["2024-01-02T03:04:05.678Z", "2024-01-02T03:04:05.679Z"]],
			["a wall-clock value on postgres", { propertyName: "at", type: "timestamp" }, "postgres", [new Date("2024-01-02T03:04:05.678Z"), new Date("2024-01-02T03:04:05.679Z")]],
			["a wall-clock value on mariadb", { propertyName: "at", type: "datetime" }, "mariadb", [new Date("2024-01-02T03:04:05.678Z"), new Date("2024-01-02T03:04:05.679Z")]],
		])("matches the whole millisecond of %s with bound operators", async (_name: string, column: IIdentityColumn, driverType: string, bounds: Array<Date | string>) => {
			const condition: FindOperator<unknown> = await readCondition(column, driverType);
			const range: Array<FindOperator<unknown>> = condition.value as Array<FindOperator<unknown>>;

			expect(condition).toBeInstanceOf(ApiFunctionBoundOperator);
			expect(condition.type).toBe("and");
			expect(range.map((operator: FindOperator<unknown>): unknown => operator instanceof ApiFunctionBoundOperator)).toEqual([true, true]);
			expect(range.map((operator: FindOperator<unknown>): string => operator.type)).toEqual(["moreThanOrEqual", "lessThan"]);
			expect(range.map((operator: FindOperator<unknown>): unknown => operator.value)).toEqual(bounds);
		});

		it.each([
			["an instant on postgres", "timestamptz", "postgres", "2024-01-02T03:04:05.000Z"],
			["a wall-clock value on mariadb", "datetime", "mariadb", new Date("2024-01-02T03:04:05.000Z")],
		])("matches the stored value of a transformed key for %s, transformed once", async (_name: string, type: string, driverType: string, expected: Date | string) => {
			const to: Mock<(value: unknown) => unknown> = vi.fn((value: unknown): unknown => (value instanceof Date ? new Date(value.getTime() - (value.getTime() % 1000)) : value));
			const condition: FindOperator<unknown> = await readCondition({ propertyName: "at", transformer: { from: (value: unknown): unknown => value, to }, type }, driverType);

			expect(condition).toBeInstanceOf(ApiFunctionBoundOperator);
			expect(condition.type).toBe("equal");
			expect(condition.value).toEqual(expected);
			expect(to).toHaveBeenCalledTimes(1);
			expect(to).toHaveBeenCalledWith(AT);
		});

		it("hands a transformed key to its transformer as the create result holds it", async () => {
			const to: Mock<(value: unknown) => unknown> = vi.fn((value: unknown): unknown => new Date(value as string));
			const condition: FindOperator<unknown> = await readCondition({ propertyName: "at", transformer: { from: (value: unknown): unknown => value, to }, type: "timestamptz" }, "postgres", "2024-01-02T03:04:05.678Z");

			expect(to).toHaveBeenCalledWith("2024-01-02T03:04:05.678Z");
			expect(condition.value).toBe("2024-01-02T03:04:05.678Z");
		});

		it("refuses an invalid date of an untransformed key", async () => {
			await expect(readCondition({ propertyName: "at", type: "timestamptz" }, "postgres", "not a date")).rejects.toThrow("Generated create result holds an invalid date in primary column at");
		});

		it("keeps other primary columns as the create result holds them", async () => {
			expect(await readCondition({ propertyName: "at", type: "varchar" }, "postgres", "event-1")).toBe("event-1");
		});

		it("counts the matching rows in the database", async () => {
			const { count, repository } = createRepository({ propertyName: "at", type: "timestamptz" }, "postgres");
			const where = await ApiControllerGeneratedCreateIdentityContract.identify(repository, { at: AT });

			expect(count).toHaveBeenCalledWith({ loadEagerRelations: false, where });
		});

		it.each([0, 2])("refuses criteria that match %i stored rows", async (rows: number) => {
			const { repository } = createRepository({ propertyName: "at", type: "timestamptz" }, "postgres", rows);

			await expect(ApiControllerGeneratedCreateIdentityContract.identify(repository, { at: AT })).rejects.toThrow("Generated create result must identify exactly one stored row");
		});
	});

	describe("confirm", () => {
		it("accepts criteria that match one stored row", async () => {
			const { repository } = createRepository({ propertyName: "id", type: "varchar" }, "postgres");

			await expect(ApiControllerGeneratedCreateIdentityContract.confirm(repository, { id: "event-1" })).resolves.toBeUndefined();
		});

		it("refuses criteria that a sibling committed into after the check", async () => {
			const { repository } = createRepository({ propertyName: "id", type: "varchar" }, "postgres", 2);

			await expect(ApiControllerGeneratedCreateIdentityContract.confirm(repository, { id: "event-1" })).rejects.toThrow("Generated create result must identify exactly one stored row");
		});

		it("refuses without a repository", async () => {
			await expect(ApiControllerGeneratedCreateIdentityContract.confirm(undefined, {})).rejects.toThrow("Repository is not available in this context");
		});
	});
});
