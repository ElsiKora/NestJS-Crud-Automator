import type { ValueTransformer } from "typeorm";

import { DatabaseTypeOrmBindInstant } from "@utility/database/typeorm/bind/instant.utility";
import { describe, expect, it } from "vitest";

const INSTANT: Date = new Date("1800-06-01T12:00:00.000Z");
const shift: ValueTransformer = { from: (value: unknown): unknown => value, to: (value: unknown): unknown => (value instanceof Date ? new Date(value.getTime() + 1000) : `shifted:${String(value)}`) };

describe("DatabaseTypeOrmBindInstant", () => {
	it.each(["postgres", "cockroachdb"])("binds a Date of an instant column on %s as canonical UTC text", (driverType: string) => {
		expect(DatabaseTypeOrmBindInstant(INSTANT, "timestamptz", driverType)).toBe("1800-06-01T12:00:00.000Z");
		expect(DatabaseTypeOrmBindInstant(INSTANT, "timestamp with time zone", driverType, shift)).toBe("1800-06-01T12:00:01.000Z");
	});

	it.each(["oracle", "mysql", "mssql", "aurora-postgres"])("keeps the transformed Date of an instant column on %s", (driverType: string) => {
		expect(DatabaseTypeOrmBindInstant(INSTANT, "timestamp with time zone", driverType, shift)).toEqual(new Date("1800-06-01T12:00:01.000Z"));
		expect(DatabaseTypeOrmBindInstant(INSTANT, "timestamp with time zone", driverType)).toBe(INSTANT);
	});

	it.each(["timestamp", "timestamp without time zone", "date", "datetime"])("keeps the transformed Date of a %s column on postgres", (columnType: string) => {
		expect(DatabaseTypeOrmBindInstant(INSTANT, columnType, "postgres", shift)).toEqual(new Date("1800-06-01T12:00:01.000Z"));
	});

	it("runs every transformer once, in order, on operands other than Dates as well", () => {
		const calls: Array<unknown> = [];
		const record = (tag: string): ValueTransformer => ({ from: (value: unknown): unknown => value, to: (value: unknown): unknown => (calls.push([tag, value]), `${tag}(${String(value)})`) });

		expect(DatabaseTypeOrmBindInstant("text", "timestamptz", "postgres", [record("a"), record("b")])).toBe("b(a(text))");
		expect(calls).toEqual([
			["a", "text"],
			["b", "a(text)"],
		]);
		expect(DatabaseTypeOrmBindInstant("text", "timestamptz", "postgres")).toBe("text");
	});

	it("binds what a transformer returns for a Date when it is not a Date", () => {
		const toText: ValueTransformer = { from: (value: unknown): unknown => value, to: (): unknown => "stored" };

		expect(DatabaseTypeOrmBindInstant(INSTANT, "timestamptz", "postgres", toText)).toBe("stored");
	});

	it("rejects an invalid Date before any transformer runs", () => {
		expect(() => DatabaseTypeOrmBindInstant(new Date(Number.NaN), "timestamptz", "oracle", shift)).toThrow("Cannot bind an invalid Date as a query parameter");
	});
});
