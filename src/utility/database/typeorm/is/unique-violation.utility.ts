import { QueryFailedError } from "typeorm";

const MYSQL_MARIADB_DUPLICATE_ENTRY_ERRNO: number = 1062;
const MYSQL_MARIADB_DUPLICATE_ENTRY_WITH_KEY_NAME_ERRNO: number = 1586;
const MSSQL_DUPLICATE_KEY_ERROR_NUMBER_1: number = 2601;
const MSSQL_DUPLICATE_KEY_ERROR_NUMBER_2: number = 2627;

// The message SQLite gives a foreign key failure, after the code sqlite3 puts in front of it
const SQLITE_FOREIGN_KEY_MESSAGE_PATTERN: RegExp = /^(?:SQLITE_CONSTRAINT\w*: )?FOREIGN KEY constraint failed/iu;

/**
 * Detects whether a TypeORM QueryFailedError is caused by a UNIQUE constraint violation.
 * The driver code, errno or SQLSTATE decides whenever the error carries one, since the MySQL, MariaDB and MSSQL message of another failure can quote a client value.
 * The message decides only for an error without any of them. A SQLite foreign key failure is never a unique violation, so this and `DatabaseTypeOrmIsForeignKeyViolation` never both hold.
 * @param {unknown} error - Error thrown by TypeORM
 * @returns {boolean} True if it looks like a UNIQUE constraint violation
 */
export function DatabaseTypeOrmIsUniqueViolation(error: unknown): boolean {
	const isQueryFailedError: boolean = error instanceof QueryFailedError || (error != null && typeof error === "object" && (error as { name?: unknown }).name === "QueryFailedError");

	if (!isQueryFailedError) {
		return false;
	}

	const driverErrorUnknown: unknown = error != null && typeof error === "object" ? (error as { driverError?: unknown }).driverError : undefined;
	const driverError: Record<string, unknown> | undefined = driverErrorUnknown != null && typeof driverErrorUnknown === "object" ? (driverErrorUnknown as Record<string, unknown>) : undefined;

	const code: unknown = driverError?.code;
	const errno: unknown = driverError?.errno;
	const number: unknown = driverError?.number;

	// PostgreSQL (SQLSTATE): unique_violation
	if (code === "23505") {
		return true;
	}

	// MySQL / MariaDB
	if (code === "ER_DUP_ENTRY" || code === "ER_DUP_ENTRY_WITH_KEY_NAME") {
		return true;
	}

	if (errno === MYSQL_MARIADB_DUPLICATE_ENTRY_ERRNO || errno === String(MYSQL_MARIADB_DUPLICATE_ENTRY_ERRNO) || errno === MYSQL_MARIADB_DUPLICATE_ENTRY_WITH_KEY_NAME_ERRNO || errno === String(MYSQL_MARIADB_DUPLICATE_ENTRY_WITH_KEY_NAME_ERRNO)) {
		return true;
	}

	// SQLite: a foreign key failure comes as SQLITE_CONSTRAINT_FOREIGNKEY, or as SQLITE_CONSTRAINT or SQLITE_CONSTRAINT_TRIGGER with a message that quotes no value
	if (typeof code === "string" && code.startsWith("SQLITE_CONSTRAINT")) {
		return code !== "SQLITE_CONSTRAINT_FOREIGNKEY" && !(typeof driverError?.message === "string" && SQLITE_FOREIGN_KEY_MESSAGE_PATTERN.test(driverError.message));
	}

	// MSSQL
	if (number === MSSQL_DUPLICATE_KEY_ERROR_NUMBER_1 || number === MSSQL_DUPLICATE_KEY_ERROR_NUMBER_2) {
		return true;
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
	if (messageLower.includes("duplicate key value violates unique constraint")) {
		return true;
	}

	// MySQL
	if (messageLower.includes("duplicate entry")) {
		return true;
	}

	// SQLite
	if (messageLower.includes("unique constraint failed")) {
		return true;
	}

	// MSSQL
	return messageLower.includes("cannot insert duplicate key");
}
