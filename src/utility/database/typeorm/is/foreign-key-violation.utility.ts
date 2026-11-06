import { QueryFailedError } from "typeorm";

const POSTGRES_FOREIGN_KEY_VIOLATION_CODE: string = "23503";
const MYSQL_CANNOT_ADD_OR_UPDATE_CHILD_ROW_ERRNO: number = 1452;
const MYSQL_CANNOT_DELETE_OR_UPDATE_PARENT_ROW_ERRNO: number = 1451;
const MYSQL_NO_REFERENCED_ROW_ERRNO: number = 1216;
const MYSQL_ROW_IS_REFERENCED_ERRNO: number = 1217;

// The message SQLite gives a foreign key failure, after the code sqlite3 puts in front of it
const SQLITE_FOREIGN_KEY_MESSAGE_PATTERN: RegExp = /^(?:SQLITE_CONSTRAINT\w*: )?FOREIGN KEY constraint failed/iu;
const MSSQL_FOREIGN_KEY_CONSTRAINT_ERROR_NUMBER: number = 547;

/**
 * Detects whether a TypeORM QueryFailedError is caused by a FOREIGN KEY constraint violation.
 * The driver code, errno or SQLSTATE decides whenever the error carries one, since the MySQL, MariaDB and MSSQL message of another failure can quote a client value.
 * The message decides only for an error without any of them, and for a SQLite constraint code, since SQLite writes that message itself and quotes no value.
 * @param {unknown} error - Error thrown by TypeORM
 * @returns {boolean} True if it looks like a FOREIGN KEY constraint violation
 */
export function DatabaseTypeOrmIsForeignKeyViolation(error: unknown): boolean {
	const isQueryFailedError: boolean = error instanceof QueryFailedError || (error != null && typeof error === "object" && (error as { name?: unknown }).name === "QueryFailedError");

	if (!isQueryFailedError) {
		return false;
	}

	const driverErrorUnknown: unknown = error != null && typeof error === "object" ? (error as { driverError?: unknown }).driverError : undefined;
	const driverError: Record<string, unknown> | undefined = driverErrorUnknown != null && typeof driverErrorUnknown === "object" ? (driverErrorUnknown as Record<string, unknown>) : undefined;

	const code: unknown = driverError?.code;
	const errno: unknown = driverError?.errno;
	const number: unknown = driverError?.number;

	// PostgreSQL (SQLSTATE): foreign_key_violation
	if (code === POSTGRES_FOREIGN_KEY_VIOLATION_CODE) {
		return true;
	}

	// MySQL / MariaDB
	if (code === "ER_NO_REFERENCED_ROW_2" || code === "ER_ROW_IS_REFERENCED_2" || code === "ER_NO_REFERENCED_ROW" || code === "ER_ROW_IS_REFERENCED") {
		return true;
	}

	if (isErrno(errno, MYSQL_NO_REFERENCED_ROW_ERRNO) || isErrno(errno, MYSQL_ROW_IS_REFERENCED_ERRNO)) {
		return true;
	}

	if (errno === MYSQL_CANNOT_ADD_OR_UPDATE_CHILD_ROW_ERRNO || errno === String(MYSQL_CANNOT_ADD_OR_UPDATE_CHILD_ROW_ERRNO)) {
		return true;
	}

	if (errno === MYSQL_CANNOT_DELETE_OR_UPDATE_PARENT_ROW_ERRNO || errno === String(MYSQL_CANNOT_DELETE_OR_UPDATE_PARENT_ROW_ERRNO)) {
		return true;
	}

	// MSSQL
	if (number === MSSQL_FOREIGN_KEY_CONSTRAINT_ERROR_NUMBER) {
		return true;
	}

	// SQLite: sqlite3 reports every constraint as SQLITE_CONSTRAINT and better-sqlite3 a RESTRICT action as SQLITE_CONSTRAINT_TRIGGER, so its message, which quotes no value, names the kind
	if (typeof code === "string" && code.startsWith("SQLITE_CONSTRAINT")) {
		return code === "SQLITE_CONSTRAINT_FOREIGNKEY" || (typeof driverError?.message === "string" && SQLITE_FOREIGN_KEY_MESSAGE_PATTERN.test(driverError.message));
	}

	if (code != null || errno != null || number != null) {
		return false;
	}

	const driverMessage: unknown = driverError?.message;
	let message: string = "";

	if (typeof driverMessage === "string") {
		message = driverMessage;
	} else if (error instanceof Error) {
		message = error.message;
	} else if (error != null && typeof error === "object" && "message" in error) {
		const objectMessage: unknown = (error as { message?: unknown }).message;

		if (typeof objectMessage === "string") {
			message = objectMessage;
		}
	}

	const messageLower: string = message.toLowerCase();

	if (!messageLower) {
		return false;
	}

	// Postgres
	if (messageLower.includes("violates foreign key constraint")) {
		return true;
	}

	// MySQL
	if (messageLower.includes("a foreign key constraint fails")) {
		return true;
	}

	if (messageLower.includes("cannot add or update a child row")) {
		return true;
	}

	if (messageLower.includes("cannot delete or update a parent row")) {
		return true;
	}

	// SQLite
	if (messageLower.includes("foreign key constraint failed")) {
		return true;
	}

	// MSSQL
	return messageLower.includes("conflicted with the foreign key constraint");
}

/**
 * Checks whether a driver errno is the given number, sent as a number or a string.
 * @param {unknown} errno - Driver errno
 * @param {number} expected - Expected errno
 * @returns {boolean} True when the errno is the expected number
 */
function isErrno(errno: unknown, expected: number): boolean {
	return errno === expected || errno === String(expected);
}
