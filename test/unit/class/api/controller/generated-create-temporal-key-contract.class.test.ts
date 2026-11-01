import type { Repository } from "typeorm";

import { ApiControllerGeneratedCreateTemporalKeyContract } from "@class/api/controller/generated/create-temporal-key-contract.class";
import { ApiControllerGeneratedTemporalBodySource } from "@class/api/controller/generated/temporal-body-source.class";
import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

interface ITemporalKeyColumn {
	precision?: null | number;
	propertyName: string;
	type: string;
}

function createRepository(columns: Array<ITemporalKeyColumn>, driverType: string = "postgres", dataTypeDefaults?: Record<string, { precision?: number }>): Repository<object> {
	return {
		manager: { dataSource: { driver: { dataTypeDefaults, normalizeType: (column: ITemporalKeyColumn): string => column.type }, options: { type: driverType } } },
		metadata: { name: "TemporalKeyEntity", primaryColumns: columns },
	} as unknown as Repository<object>;
}

function readMessages(callback: () => void): Array<string> {
	try {
		callback();
	} catch (error) {
		expect(error).toBeInstanceOf(BadRequestException);

		return ((error as BadRequestException).getResponse() as { message: Array<string> }).message;
	}

	throw new Error("Expected a BadRequestException");
}

const INSTANT: ITemporalKeyColumn = { propertyName: "at", type: "timestamp with time zone" };
const WALL_CLOCK: ITemporalKeyColumn = { propertyName: "at", type: "timestamp without time zone" };

describe("ApiControllerGeneratedCreateTemporalKeyContract", () => {
	describe("parse", () => {
		it.each([
			["an instant with a zone designator", INSTANT, "2024-01-02T03:04:05.678Z", "2024-01-02T03:04:05.678Z"],
			["an instant with an offset", INSTANT, "2024-11-03T01:30:00-04:00", "2024-11-03T05:30:00.000Z"],
			["a wall-clock value without a zone", WALL_CLOCK, "2024-03-10T02:30:00", new Date("2024-03-10T02:30:00")],
			["a wall-clock value with a space separator", WALL_CLOCK, "2024-01-02 03:04:05.678", new Date("2024-01-02T03:04:05.678")],
			["a fraction padded with zeros", { ...INSTANT, precision: 0 }, "2024-01-02T03:04:05.000000Z", "2024-01-02T03:04:05.000Z"],
		])("writes the parsed value of %s into the body", (_name: string, column: ITemporalKeyColumn, value: string, expected: Date | string) => {
			const body: Record<string, unknown> = { at: value };

			ApiControllerGeneratedCreateTemporalKeyContract.parse(createRepository([column]), body);

			expect(body.at).toEqual(expected);
		});

		it("refuses an instant without a zone and leaves the body as it was", () => {
			const body: Record<string, unknown> = { at: "2024-03-10T02:30:00" };

			expect(readMessages(() => ApiControllerGeneratedCreateTemporalKeyContract.parse(createRepository([INSTANT]), body))).toEqual(["at must carry a time zone designator or an offset"]);
			expect(body.at).toBe("2024-03-10T02:30:00");
		});

		it.each([["not a date"], ["2024-01-02"], ["2024-13-45T00:00:00Z"], [""]])("refuses the text %j as a date and time", (value: string) => {
			expect(readMessages(() => ApiControllerGeneratedCreateTemporalKeyContract.parse(createRepository([WALL_CLOCK]), { at: value }))).toEqual(["at must be a valid ISO 8601 date-time"]);
		});

		it.each([
			["a number", 1_704_164_645_678],
			["an invalid Date", new Date(Number.NaN)],
			["an object", { at: "2024-01-02T03:04:05.678Z" }],
		])("refuses %s as a date and time", (_name: string, value: unknown) => {
			expect(readMessages(() => ApiControllerGeneratedCreateTemporalKeyContract.parse(createRepository([INSTANT]), { at: value }))).toEqual(["at must be a valid ISO 8601 date-time"]);
		});

		it.each([
			["milliseconds for timestamptz(0)", { ...INSTANT, precision: 0 }, undefined, "2024-01-02T03:04:05.678Z", 0],
			["microseconds for timestamptz(3)", { ...INSTANT, precision: 3 }, undefined, "2024-01-02T03:04:05.678912Z", 3],
			["microseconds for the PostgreSQL default precision a Date cannot hold", INSTANT, { "timestamp with time zone": { precision: 6 } }, "2024-01-02T03:04:05.123789Z", 3],
			["milliseconds for the MySQL default datetime precision", { propertyName: "at", type: "datetime" }, { datetime: { precision: 0 } }, "2024-01-02 03:04:05.678", 0],
		])("refuses %s", (_name: string, column: ITemporalKeyColumn, dataTypeDefaults: Record<string, { precision?: number }> | undefined, value: string, digits: number) => {
			expect(readMessages(() => ApiControllerGeneratedCreateTemporalKeyContract.parse(createRepository([column], "postgres", dataTypeDefaults), { at: value }))).toEqual([`at must not hold more than ${digits} fractional second digits`]);
		});

		it.each([
			["a Date within the column precision", { ...INSTANT, precision: 0 }, new Date("2024-01-02T03:04:05.000Z"), true],
			["a Date more precise than the column", { ...INSTANT, precision: 0 }, new Date("2024-01-02T03:04:05.678Z"), false],
			["a Date before 1970 more precise than the column", { ...INSTANT, precision: 1 }, new Date("1800-01-01T00:00:00.678Z"), false],
			["a Date before 1970 within the column precision", { ...INSTANT, precision: 1 }, new Date("1800-01-01T00:00:00.600Z"), true],
		])("checks %s", (_name: string, column: ITemporalKeyColumn, value: Date, isAccepted: boolean) => {
			const body: Record<string, unknown> = { at: value };
			const parse = (): void => ApiControllerGeneratedCreateTemporalKeyContract.parse(createRepository([column]), body);

			if (isAccepted) {
				parse();
				expect(body.at).toBe(value.toISOString());
			} else {
				expect(readMessages(parse)).toEqual([`at must not hold more than ${String(column.precision)} fractional second digits`]);
			}
		});

		it.each([
			["accepts a text within the column", INSTANT, "2024-01-02T03:04:05.678Z", undefined],
			["refuses a Date whose text had no zone", INSTANT, "2024-03-10T02:30:00", "at must carry a time zone designator or an offset"],
			["refuses a Date whose text is finer than milliseconds", INSTANT, "2024-01-02T03:04:05.123789Z", "at must not hold more than 3 fractional second digits"],
			["refuses a Date whose text holds no time of day", WALL_CLOCK, "2024-01-02", "at must be a valid ISO 8601 date-time"],
		])("%s after a body DTO parsed it", (_name: string, column: ITemporalKeyColumn, text: string, message: string | undefined) => {
			const date: Date = ApiControllerGeneratedTemporalBodySource.parse(text);
			const body: Record<string, unknown> = { at: date };
			const parse = (): void => ApiControllerGeneratedCreateTemporalKeyContract.parse(createRepository([column]), body);

			if (message) {
				expect(readMessages(parse)).toEqual([message]);
				expect(body.at).toBe(date);
			} else {
				parse();
				expect(body.at).toBe(date.toISOString());
			}
		});

		it("collects the message of every primary column", () => {
			const columns: Array<ITemporalKeyColumn> = [INSTANT, { precision: 0, propertyName: "until", type: "timestamp without time zone" }];

			expect(readMessages(() => ApiControllerGeneratedCreateTemporalKeyContract.parse(createRepository(columns), { at: "2024-01-02T03:04:05", until: "2024-01-02T03:04:05.5" }))).toEqual(["at must carry a time zone designator or an offset", "until must not hold more than 0 fractional second digits"]);
		});

		it("leaves other primary columns and absent values alone", () => {
			const body: Record<string, unknown> = { day: "2024-01-02", id: "2024-01-02T03:04:05", until: null };

			ApiControllerGeneratedCreateTemporalKeyContract.parse(createRepository([{ propertyName: "id", type: "varchar" }, { propertyName: "day", type: "date" }, INSTANT, { ...WALL_CLOCK, propertyName: "until" }]), body);

			expect(body).toEqual({ day: "2024-01-02", id: "2024-01-02T03:04:05", until: null });
		});

		it("needs the repository and accepts a missing body", () => {
			expect(() => ApiControllerGeneratedCreateTemporalKeyContract.parse(undefined, {})).toThrow("Repository is not available in this context");
			expect(() => ApiControllerGeneratedCreateTemporalKeyContract.parse(createRepository([INSTANT]), undefined)).not.toThrow();
		});
	});

	describe("assertDriver", () => {
		it.each([["cockroachdb"], ["mariadb"], ["postgres"]])("accepts a date and time primary key on %s", (driverType: string) => {
			expect(() => ApiControllerGeneratedCreateTemporalKeyContract.assertDriver(createRepository([INSTANT], driverType))).not.toThrow();
		});

		it("names the driver and the column of an unsupported date and time primary key", () => {
			expect(() =>
				ApiControllerGeneratedCreateTemporalKeyContract.assertDriver(
					createRepository(
						[
							{ propertyName: "id", type: "varchar" },
							{ propertyName: "at", type: "datetime2" },
						],
						"mssql",
					),
				),
			).toThrow("Generated create of TemporalKeyEntity cannot identify its date and time primary column at on the mssql driver; supported drivers are cockroachdb, mariadb, postgres");
		});

		it.each([["better-sqlite3"], ["mysql"], ["sqlite"]])("refuses a date and time primary key on %s", (driverType: string) => {
			expect(() => ApiControllerGeneratedCreateTemporalKeyContract.assertDriver(createRepository([INSTANT], driverType))).toThrow(`on the ${driverType} driver`);
		});

		it.each([
			["a text primary key", { propertyName: "id", type: "varchar" }],
			["a date primary key", { propertyName: "day", type: "date" }],
		])("accepts %s on an unsupported driver", (_name: string, column: ITemporalKeyColumn) => {
			expect(() => ApiControllerGeneratedCreateTemporalKeyContract.assertDriver(createRepository([column], "mssql"))).not.toThrow();
		});

		it("checks nothing without a repository", () => {
			expect(() => ApiControllerGeneratedCreateTemporalKeyContract.assertDriver(undefined)).not.toThrow();
		});
	});
});
