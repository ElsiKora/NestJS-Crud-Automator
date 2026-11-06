import { EApiFunctionType } from "@enum/decorator/api";
import { BadRequestException, ConflictException, HttpStatus } from "@nestjs/common";
import { ErrorForeignKeyException } from "@utility/error/foreign-key-exception.utility";
import { LoggerUtility } from "@utility/logger.utility";
import { afterEach, describe, expect, it, vi } from "vitest";

const POSTGRES_REFERENCED = { driverError: { code: "23503", constraint: "FK_owner", detail: 'Key (id)=(7) is still referenced from table "items".', message: 'update or delete on table "owners" violates foreign key constraint "FK_owner" on table "items"', table: "items" }, name: "QueryFailedError" };
const POSTGRES_MISSING = { driverError: { code: "23503", constraint: "FK_owner", detail: 'Key (ownerId)=(7) is not present in table "owners".', message: 'insert or update on table "items" violates foreign key constraint "FK_owner"', table: "items" }, name: "QueryFailedError" };
const SQLITE = { driverError: { code: "SQLITE_CONSTRAINT_FOREIGNKEY", message: "FOREIGN KEY constraint failed" }, name: "QueryFailedError" };

class OwnerEntity {}

describe("ErrorForeignKeyException", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each([
		["a DELETE on SQLite", EApiFunctionType.DELETE, SQLITE],
		["a DELETE on PostgreSQL", EApiFunctionType.DELETE, POSTGRES_REFERENCED],
		["an UPDATE the driver states hits a referenced row", EApiFunctionType.UPDATE, POSTGRES_REFERENCED],
		["a CREATE the driver states hits a referenced row", EApiFunctionType.CREATE, POSTGRES_REFERENCED],
	])("answers 409 REFERENCED for %s", (_name: string, functionType: EApiFunctionType, cause: object) => {
		vi.spyOn(LoggerUtility.prototype, "verbose").mockImplementation(() => undefined);

		const refusal: BadRequestException | ConflictException = ErrorForeignKeyException(OwnerEntity, functionType, cause);

		expect(refusal).toBeInstanceOf(ConflictException);
		expect(refusal.getResponse()).toEqual({ details: { type: "FOREIGN_KEY_VIOLATION" }, error: "Conflict", message: "OWNERENTITY_REFERENCED", statusCode: HttpStatus.CONFLICT });
		expect(refusal.cause).toBe(cause);
	});

	it.each([
		["a CREATE on SQLite", EApiFunctionType.CREATE, SQLITE],
		["an UPDATE on SQLite", EApiFunctionType.UPDATE, SQLITE],
		["a CREATE on PostgreSQL", EApiFunctionType.CREATE, POSTGRES_MISSING],
		["an UPDATE on PostgreSQL", EApiFunctionType.UPDATE, POSTGRES_MISSING],
	])("answers 400 REFERENCE_NOT_VALID for %s", (_name: string, functionType: EApiFunctionType, cause: object) => {
		vi.spyOn(LoggerUtility.prototype, "verbose").mockImplementation(() => undefined);

		const refusal: BadRequestException | ConflictException = ErrorForeignKeyException(OwnerEntity, functionType, cause);

		expect(refusal).toBeInstanceOf(BadRequestException);
		expect(refusal.getResponse()).toEqual({ details: { type: "FOREIGN_KEY_VIOLATION" }, error: "Bad Request", message: "OWNERENTITY_REFERENCE_NOT_VALID", statusCode: HttpStatus.BAD_REQUEST });
		expect(refusal.cause).toBe(cause);
	});

	it("keeps the driver text out of the body and logs only the schema names under the function", () => {
		const verbose = vi.spyOn(LoggerUtility.prototype, "verbose").mockImplementation(() => undefined);

		const refusal: BadRequestException | ConflictException = ErrorForeignKeyException(OwnerEntity, EApiFunctionType.CREATE, POSTGRES_MISSING);

		expect(JSON.stringify(refusal.getResponse())).not.toMatch(/FK_owner|items|owners|ownerId|7/u);
		expect(verbose).toHaveBeenCalledTimes(1);
		// Schema names only: the key value 7 and the driver detail stay out of the log
		expect(verbose.mock.calls[0]?.[0]).toBe('Foreign key violation (reference not valid) for entity OwnerEntity: errorType=QueryFailedError sqlState=23503 details={"constraint":"FK_owner","field":"ownerId","referencedTable":"owners","table":"items"}');
		expect(verbose.mock.contexts[0]).toMatchObject({ context: "NestJS-Crud-Automator/ApiFunctionCreate" });
	});
});
