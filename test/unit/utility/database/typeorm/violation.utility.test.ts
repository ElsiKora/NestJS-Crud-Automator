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
