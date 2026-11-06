import { QueryFailedError } from "typeorm";

const MYSQL_CANNOT_DELETE_OR_UPDATE_PARENT_ROW_CODE: string = "ER_ROW_IS_REFERENCED_2";
const MYSQL_CANNOT_DELETE_OR_UPDATE_PARENT_ROW_ERRNO: number = 1451;

/**
 * Detects whether a TypeORM foreign key violation states that the row is still referenced by another row, rather than that it names a related row that does not exist.
 * It reads only the wording a driver gives for that direction: the PostgreSQL detail `is still referenced from table`, MySQL and MariaDB errno `1451` (`ER_ROW_IS_REFERENCED_2`, "Cannot delete or update a parent row"), and the MSSQL `REFERENCE constraint` conflict.
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
	if (driverError?.code === MYSQL_CANNOT_DELETE_OR_UPDATE_PARENT_ROW_CODE || driverError?.errno === MYSQL_CANNOT_DELETE_OR_UPDATE_PARENT_ROW_ERRNO || driverError?.errno === String(MYSQL_CANNOT_DELETE_OR_UPDATE_PARENT_ROW_ERRNO)) {
		return true;
	}

	// PostgreSQL
	if (typeof driverError?.detail === "string" && driverError.detail.toLowerCase().includes("is still referenced from table")) {
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

	// MSSQL: a DELETE, or an UPDATE of the referenced key, conflicts with the REFERENCE constraint; a write that names a missing row conflicts with the FOREIGN KEY constraint
	return messageLower.includes("conflicted with the reference constraint");
}
