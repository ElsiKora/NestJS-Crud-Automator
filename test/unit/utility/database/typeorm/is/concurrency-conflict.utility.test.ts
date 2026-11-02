import { DatabaseTypeOrmIsConcurrencyConflict } from "@utility/database/typeorm/is/concurrency-conflict.utility";
import { QueryFailedError } from "typeorm";
import { describe, expect, it } from "vitest";

function queryFailure(driverError: object): QueryFailedError {
	return new QueryFailedError("INSERT", [], Object.assign(new Error("failed"), driverError));
}

describe("DatabaseTypeOrmIsConcurrencyConflict", () => {
	it.each([
		["a MySQL or MariaDB deadlock", { code: "ER_LOCK_DEADLOCK", errno: 1213 }],
		["a MariaDB snapshot conflict", { code: "ER_CHECKREAD", errno: 1020 }],
		["a PostgreSQL deadlock", { code: "40P01" }],
		["a PostgreSQL serialization failure", { code: "40001" }],
	])("recognizes %s", (_name: string, driverError: object) => {
		expect(DatabaseTypeOrmIsConcurrencyConflict(queryFailure(driverError))).toBe(true);
	});

	it.each([
		["a unique violation", queryFailure({ code: "23505" })],
		["a duplicate entry", queryFailure({ code: "ER_DUP_ENTRY", errno: 1062 })],
		["another error", new Error("40001")],
		["no error", undefined],
	])("does not recognize %s", (_name: string, error: unknown) => {
		expect(DatabaseTypeOrmIsConcurrencyConflict(error)).toBe(false);
	});
});
