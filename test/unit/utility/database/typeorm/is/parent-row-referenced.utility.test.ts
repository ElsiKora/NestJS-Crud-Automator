import { DatabaseTypeOrmIsParentRowReferenced } from "@utility/database/typeorm/is/parent-row-referenced.utility";
import { QueryFailedError } from "typeorm";
import { describe, expect, it } from "vitest";

function queryFailure(message: string, driverError: object): QueryFailedError {
	return new QueryFailedError("DELETE", [], Object.assign(new Error(message), driverError));
}

describe("DatabaseTypeOrmIsParentRowReferenced", () => {
	it.each([
		["a PostgreSQL delete of a row still referenced", queryFailure('update or delete on table "owners" violates foreign key constraint "FK_owner" on table "items"', { code: "23503", detail: 'Key (id)=(1) is still referenced from table "items".' })],
		["a MySQL delete of a parent row", queryFailure("Cannot delete or update a parent row: a foreign key constraint fails (`db`.`items`, CONSTRAINT `FK_owner` FOREIGN KEY (`ownerId`) REFERENCES `owners` (`id`))", { code: "ER_ROW_IS_REFERENCED_2", errno: 1451 })],
		["a MariaDB delete of a parent row", queryFailure("Cannot delete or update a parent row: a foreign key constraint fails", { code: "ER_ROW_IS_REFERENCED_2", errno: 1451 })],
		["a MySQL errno without its code", queryFailure("failed", { errno: 1451 })],
		["an MSSQL delete", queryFailure('The DELETE statement conflicted with the REFERENCE constraint "FK_owner". The conflict occurred in database "db", table "dbo.items", column \'ownerId\'.', { number: 547 })],
		["an MSSQL update of a referenced key", queryFailure('The UPDATE statement conflicted with the REFERENCE constraint "FK_owner".', { number: 547 })],
		["an MSSQL delete in a self-referencing table", queryFailure('The DELETE statement conflicted with the SAME TABLE REFERENCE constraint "FK_parent". The conflict occurred in database "db", table "dbo.nodes", column \'parentId\'.', { number: 547 })],
		["a MySQL errno of the older parent row error", queryFailure("Cannot delete or update a parent row: a foreign key constraint fails", { code: "ER_ROW_IS_REFERENCED", errno: 1217 })],
		["a PostgreSQL message of a delete without its detail", queryFailure('update or delete on table "owners" violates foreign key constraint "FK_owner" on table "items"', { code: "23503" })],
	])("states the row is still referenced for %s", (_name: string, error: QueryFailedError) => {
		expect(DatabaseTypeOrmIsParentRowReferenced(error)).toBe(true);
	});

	it.each([
		["a PostgreSQL write of a missing reference", queryFailure('insert or update on table "items" violates foreign key constraint "FK_owner"', { code: "23503", detail: 'Key (ownerId)=(9) is not present in table "owners".' })],
		["a MySQL write of a missing reference", queryFailure("Cannot add or update a child row: a foreign key constraint fails", { code: "ER_NO_REFERENCED_ROW_2", errno: 1452 })],
		["a MariaDB write of a missing reference", queryFailure("Cannot add or update a child row: a foreign key constraint fails", { code: "ER_NO_REFERENCED_ROW_2", errno: 1452 })],
		["an MSSQL write of a missing reference", queryFailure('The INSERT statement conflicted with the FOREIGN KEY constraint "FK_owner".', { number: 547 })],
		["a PostgreSQL write whose key value quotes the still referenced detail", queryFailure('insert or update on table "items" violates foreign key constraint "FK_owner"', { code: "23503", detail: 'Key (ownerId)=(x) is still referenced from table "items".) is not present in table "owners".' })],
		["an MSSQL write whose message names the foreign key constraint", queryFailure('The UPDATE statement conflicted with the FOREIGN KEY constraint "FK_owner".', { number: 547 })],
		["SQLite, which names no direction", queryFailure("SQLITE_CONSTRAINT: FOREIGN KEY constraint failed", { code: "SQLITE_CONSTRAINT_FOREIGNKEY" })],
	])("does not state it for %s", (_name: string, error: QueryFailedError) => {
		expect(DatabaseTypeOrmIsParentRowReferenced(error)).toBe(false);
	});

	it("reads a plain object that names itself QueryFailedError", () => {
		expect(DatabaseTypeOrmIsParentRowReferenced({ driverError: { errno: "1451" }, name: "QueryFailedError" })).toBe(true);
	});

	it.each([
		["an error that is not a query failure", new Error("Cannot delete or update a parent row")],
		["undefined", undefined],
		["a string", "is still referenced from table"],
	])("does not state it for %s", (_name: string, error: unknown) => {
		expect(DatabaseTypeOrmIsParentRowReferenced(error)).toBe(false);
	});
});
