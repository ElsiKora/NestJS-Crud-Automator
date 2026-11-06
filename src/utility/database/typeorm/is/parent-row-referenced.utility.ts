import { QueryFailedError } from "typeorm";

const MYSQL_CANNOT_DELETE_OR_UPDATE_PARENT_ROW_CODE: string = "ER_ROW_IS_REFERENCED_2";
const MYSQL_CANNOT_DELETE_OR_UPDATE_PARENT_ROW_ERRNO: number = 1451;
const MYSQL_ROW_IS_REFERENCED_CODE: string = "ER_ROW_IS_REFERENCED";
const MYSQL_ROW_IS_REFERENCED_ERRNO: number = 1217;

// The PostgreSQL detail quotes the key value first, so only its end, which names the referencing table, decides
const POSTGRES_STILL_REFERENCED_DETAIL_PATTERN: RegExp = /is still referenced from table "[^"]*"\.?$/u;

// The PostgreSQL message of a DELETE or a key UPDATE names only tables and the constraint
const POSTGRES_PARENT_ROW_MESSAGE_PREFIX: string = "update or delete on table";

// A DELETE or a key UPDATE conflicts with the REFERENCE constraint, or with the SAME TABLE REFERENCE constraint of a self-referencing table
const MSSQL_REFERENCE_CONFLICT_PATTERN: RegExp = /conflicted with the (?:same table )?reference constraint/iu;

/**
 * Detects whether a TypeORM foreign key violation states that the row is still referenced by another row, rather than that it names a related row that does not exist.
 * It reads only driver text that holds no client value: the PostgreSQL message `update or delete on table` or the end of its detail `is still referenced from table "...".`, MySQL and MariaDB errno `1451` (`ER_ROW_IS_REFERENCED_2`) and `1217` (`ER_ROW_IS_REFERENCED`), and the MSSQL `REFERENCE constraint` or `SAME TABLE REFERENCE constraint` conflict.
 * SQLite names no direction, so the caller decides by its operation.
 * @param {unknown} error - Error thrown by TypeORM
 * @returns {boolean} True when the driver states that the row is still referenced
 */
export function DatabaseTypeOrmIsParentRowReferenced(error: unknown): boolean {
	const isQueryFailedError: boolean = error instanceof QueryFailedError || (error != null && typeof error === "object" && (error as { name?: unknown }).name === "QueryFailedError");

	if (!isQueryFailedError) {
		return false;
	}

	const driverErrorUnknown: unknown = error != null && typeof error === "object" ? (error as { driverError?: unknown }).driverError : undefined;
	const driverError: Record<string, unknown> | undefined = driverErrorUnknown != null && typeof driverErrorUnknown === "object" ? (driverErrorUnknown as Record<string, unknown>) : undefined;

	// MySQL / MariaDB
	const errno: unknown = driverError?.errno;

	if (driverError?.code === MYSQL_CANNOT_DELETE_OR_UPDATE_PARENT_ROW_CODE || driverError?.code === MYSQL_ROW_IS_REFERENCED_CODE || errno === MYSQL_CANNOT_DELETE_OR_UPDATE_PARENT_ROW_ERRNO || errno === String(MYSQL_CANNOT_DELETE_OR_UPDATE_PARENT_ROW_ERRNO) || errno === MYSQL_ROW_IS_REFERENCED_ERRNO || errno === String(MYSQL_ROW_IS_REFERENCED_ERRNO)) {
		return true;
	}

	// PostgreSQL
	if (typeof driverError?.detail === "string" && POSTGRES_STILL_REFERENCED_DETAIL_PATTERN.test(driverError.detail)) {
		return true;
	}

	const driverMessage: unknown = driverError?.message;
	let message: string = "";

	if (typeof driverMessage === "string") {
		message = driverMessage;
	} else if (error instanceof Error) {
		message = error.message;
	}

	const messageLower: string = message.toLowerCase();

	// MySQL / MariaDB
	if (messageLower.includes("cannot delete or update a parent row")) {
		return true;
	}

	// PostgreSQL
	if (messageLower.startsWith(POSTGRES_PARENT_ROW_MESSAGE_PREFIX)) {
		return true;
	}

	// MSSQL: a write that names a missing row conflicts with the FOREIGN KEY constraint instead
	return MSSQL_REFERENCE_CONFLICT_PATTERN.test(message);
}
