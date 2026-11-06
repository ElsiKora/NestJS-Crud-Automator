import { DatabaseTypeOrmGetForeignKeyViolationDetails } from "@utility/database/typeorm/get/foreign-key-violation-details.utility";
import { DatabaseTypeOrmGetUniqueViolationDetails } from "@utility/database/typeorm/get/unique-violation-details.utility";
import { DatabaseTypeOrmIsEntityMetadataNotFound } from "@utility/database/typeorm/is/entity/metadata-not-found.utility";
import { DatabaseTypeOrmIsEntityNotFound } from "@utility/database/typeorm/is/entity/not-found.utility";
import { DatabaseTypeOrmIsForeignKeyViolation } from "@utility/database/typeorm/is/foreign-key-violation.utility";
import { DatabaseTypeOrmIsUniqueViolation } from "@utility/database/typeorm/is/unique-violation.utility";
import { describe, expect, it } from "vitest";

const buildQueryError = (driverError: Record<string, unknown>, message?: string) => ({
	name: "QueryFailedError",
	driverError,
	message,
});

describe("TypeORM violation helpers", () => {
	it("detects unique violations across drivers and message fallbacks", () => {
		expect(DatabaseTypeOrmIsUniqueViolation(buildQueryError({ code: "23505" }))).toBe(true);
		expect(DatabaseTypeOrmIsUniqueViolation(buildQueryError({ code: "ER_DUP_ENTRY" }))).toBe(true);
		expect(DatabaseTypeOrmIsUniqueViolation(buildQueryError({ errno: 1062 }))).toBe(true);
		expect(DatabaseTypeOrmIsUniqueViolation(buildQueryError({}, "duplicate key value violates unique constraint"))).toBe(true);
		expect(DatabaseTypeOrmIsUniqueViolation(new Error("not a query error"))).toBe(false);
	});

	it("detects foreign key violations across drivers and message fallbacks", () => {
		expect(DatabaseTypeOrmIsForeignKeyViolation(buildQueryError({ code: "23503" }))).toBe(true);
		expect(DatabaseTypeOrmIsForeignKeyViolation(buildQueryError({ code: "ER_ROW_IS_REFERENCED_2" }))).toBe(true);
		expect(DatabaseTypeOrmIsForeignKeyViolation(buildQueryError({ errno: 1451 }))).toBe(true);
		expect(DatabaseTypeOrmIsForeignKeyViolation(buildQueryError({}, "violates foreign key constraint"))).toBe(true);
		expect(DatabaseTypeOrmIsForeignKeyViolation(new Error("not a query error"))).toBe(false);
	});

	// A client value that quotes the foreign key wording of every driver
	const CRAFTED_VALUE: string = "a foreign key constraint fails; cannot add or update a child row; violates foreign key constraint; FOREIGN KEY constraint failed; conflicted with the FOREIGN KEY constraint";

	it.each([
		["MySQL", { code: "ER_DUP_ENTRY", errno: 1062, message: `Duplicate entry '${CRAFTED_VALUE}' for key 'items.name'`, sqlState: "23000" }],
		["MariaDB", { code: "ER_DUP_ENTRY", errno: 1062, message: `Duplicate entry '${CRAFTED_VALUE}' for key 'name'`, sqlState: "23000" }],
		["MSSQL", { code: "EREQUEST", message: `Violation of UNIQUE KEY constraint 'UQ_name'. Cannot insert duplicate key in object 'dbo.items'. The duplicate key value is (${CRAFTED_VALUE}).`, number: 2627 }],
		["PostgreSQL", { code: "23505", detail: `Key (name)=(${CRAFTED_VALUE}) already exists.`, message: 'duplicate key value violates unique constraint "UQ_name"' }],
		["SQLite through better-sqlite3", { code: "SQLITE_CONSTRAINT_UNIQUE", message: "UNIQUE constraint failed: items.name" }],
		["SQLite through sqlite3", { code: "SQLITE_CONSTRAINT", errno: 19, message: "SQLITE_CONSTRAINT: UNIQUE constraint failed: items.name" }],
	])("reads a %s duplicate whose value quotes foreign key wording as a unique violation only", (_driver: string, driverError: Record<string, unknown>) => {
		const error = buildQueryError(driverError, driverError.message as string);

		expect(DatabaseTypeOrmIsUniqueViolation(error)).toBe(true);
		expect(DatabaseTypeOrmIsForeignKeyViolation(error)).toBe(false);
	});

	it.each([
		["PostgreSQL", { code: "23503", message: 'insert or update on table "items" violates foreign key constraint "FK_owner"' }],
		["MySQL", { code: "ER_NO_REFERENCED_ROW_2", errno: 1452, message: "Cannot add or update a child row: a foreign key constraint fails" }],
		["MySQL with the older errno", { code: "ER_NO_REFERENCED_ROW", errno: 1216, message: "Cannot add or update a child row: a foreign key constraint fails" }],
		["MySQL with the older parent row errno", { code: "ER_ROW_IS_REFERENCED", errno: 1217, message: "Cannot delete or update a parent row: a foreign key constraint fails" }],
		["MSSQL", { code: "EREQUEST", message: 'The INSERT statement conflicted with the FOREIGN KEY constraint "FK_owner".', number: 547 }],
		["SQLite through better-sqlite3", { code: "SQLITE_CONSTRAINT_FOREIGNKEY", message: "FOREIGN KEY constraint failed" }],
		["SQLite through sqlite3", { code: "SQLITE_CONSTRAINT", errno: 19, message: "SQLITE_CONSTRAINT: FOREIGN KEY constraint failed" }],
		["SQLite on a RESTRICT delete", { code: "SQLITE_CONSTRAINT_TRIGGER", message: "FOREIGN KEY constraint failed" }],
	])("reads a %s foreign key failure as a foreign key violation only", (_driver: string, driverError: Record<string, unknown>) => {
		const error = buildQueryError(driverError, driverError.message as string);

		expect(DatabaseTypeOrmIsForeignKeyViolation(error)).toBe(true);
		expect(DatabaseTypeOrmIsUniqueViolation(error)).toBe(false);
	});

	it("reads the message only when the error carries no driver code", () => {
		expect(DatabaseTypeOrmIsForeignKeyViolation(buildQueryError({ code: "ER_BAD_NULL_ERROR", errno: 1048 }, "a foreign key constraint fails"))).toBe(false);
		expect(DatabaseTypeOrmIsUniqueViolation(buildQueryError({ code: "ER_NO_REFERENCED_ROW_2", errno: 1452 }, "Duplicate entry"))).toBe(false);
		expect(DatabaseTypeOrmIsForeignKeyViolation(buildQueryError({}, "a foreign key constraint fails"))).toBe(true);
		expect(DatabaseTypeOrmIsUniqueViolation(buildQueryError({}, "Duplicate entry 'x' for key 'name'"))).toBe(true);
	});

	it("extracts unique violation details from postgres and mysql messages", () => {
		const postgres = buildQueryError(
			{
				constraint: "users_email_key",
				detail: "Key (email)=(test@example.com) already exists.",
				table: "users",
			},
			'duplicate key value violates unique constraint "users_email_key" on table "users"',
		);
		const details = DatabaseTypeOrmGetUniqueViolationDetails(postgres);

		expect(details?.constraint).toBe("users_email_key");
		expect(details?.field).toBe("email");
		expect(details?.value).toBe("test@example.com");
		expect(details?.table).toBe("users");

		const mysql = buildQueryError({}, "Duplicate entry 'foo' for key 'users.email'");
		const mysqlDetails = DatabaseTypeOrmGetUniqueViolationDetails(mysql);

		expect(mysqlDetails?.field).toBe("email");
		expect(mysqlDetails?.value).toBe("foo");
	});

	it("extracts foreign key violation details from postgres messages", () => {
		const postgres = buildQueryError(
			{
				detail: 'Key (ownerId)=(123) is not present in table "owners"',
			},
			'insert or update on table "items" violates foreign key constraint "items_ownerId_fkey" on table "items"',
		);
		const details = DatabaseTypeOrmGetForeignKeyViolationDetails(postgres);

		expect(details?.field).toBe("ownerId");
		expect(details?.value).toBe("123");
		expect(details?.referencedTable).toBe("owners");
	});

	it("reads the PostgreSQL columns and referenced table from the ends of the detail, whatever the key value quotes", () => {
		const crafted = buildQueryError(
			{
				code: "23503",
				detail: 'Key (ownerId)=(x) is still referenced from table "secret") is not present in table "owners".',
			},
			'insert or update on table "items" violates foreign key constraint "FK_owner"',
		);
		const details = DatabaseTypeOrmGetForeignKeyViolationDetails(crafted);

		expect(details?.field).toBe("ownerId");
		expect(details?.referencedTable).toBe("owners");
		expect(details?.value).toBe('x) is still referenced from table "secret"');
	});

	it("detects entity not found errors", () => {
		expect(DatabaseTypeOrmIsEntityNotFound({ name: "EntityNotFoundError" })).toBe(true);
		expect(DatabaseTypeOrmIsEntityNotFound({ message: "Could not find any entity of type" })).toBe(true);
		expect(DatabaseTypeOrmIsEntityNotFound(new Error("other error"))).toBe(false);
	});

	it("detects metadata not found errors", () => {
		expect(DatabaseTypeOrmIsEntityMetadataNotFound({ name: "EntityMetadataNotFoundError" })).toBe(true);
		expect(DatabaseTypeOrmIsEntityMetadataNotFound({ message: "No metadata for Foo" })).toBe(true);
		expect(DatabaseTypeOrmIsEntityMetadataNotFound(new Error("other error"))).toBe(false);
	});
});
