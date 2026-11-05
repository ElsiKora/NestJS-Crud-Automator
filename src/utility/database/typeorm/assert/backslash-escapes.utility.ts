import type { DataSource } from "typeorm";

import { DatabaseTypeOrmIsRepository } from "@utility/database/typeorm/is/repository.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";

// Drivers that bind a value as MySQL text, whose quote the driver escapes with a backslash.
const BACKSLASH_ESCAPES_DRIVER_TYPES: ReadonlySet<string> = new Set<string>(["aurora-mysql", "mariadb", "mysql"]);

// The sql_mode that makes a backslash plain text in a string literal.
const NO_BACKSLASH_ESCAPES_MODE: string = "NO_BACKSLASH_ESCAPES";

const backslashEscapesLogger: LoggerUtility = LoggerUtility.getLogger("DatabaseTypeOrmAssertBackslashEscapes");

// The sql_mode values read from each DataSource, read once per DataSource.
const backslashEscapesModes: WeakMap<DataSource, Promise<ReadonlyArray<string>>> = new WeakMap<DataSource, Promise<ReadonlyArray<string>>>();

/**
 * Refuses a MySQL or MariaDB DataSource whose sql_mode holds NO_BACKSLASH_ESCAPES. The MySQL driver writes each bound
 * value into the query text and escapes a quote in it with a backslash, which that mode reads as plain text, so a
 * client value could end the string and run as SQL. The session mode of a pooled connection and the global mode that
 * a new connection takes are both read, once per DataSource. A DataSource that has not started yet, or that is not
 * MySQL or MariaDB, is not checked.
 * @param {unknown} repository - The `repository` of the controller's service.
 * @param {string} controllerName - Controller named in the error.
 * @returns {Promise<void>} Resolves when the DataSource keeps backslash escapes.
 * @throws {Error} When the session or global sql_mode of the DataSource holds NO_BACKSLASH_ESCAPES.
 */
export async function DatabaseTypeOrmAssertBackslashEscapes(repository: unknown, controllerName: string): Promise<void> {
	if (!DatabaseTypeOrmIsRepository(repository)) {
		return;
	}

	const dataSource: DataSource = repository.manager.dataSource;

	if (!dataSource.isInitialized || !BACKSLASH_ESCAPES_DRIVER_TYPES.has(dataSource.options.type)) {
		return;
	}

	let modes: Promise<ReadonlyArray<string>> | undefined = backslashEscapesModes.get(dataSource);

	if (!modes) {
		modes = readModes(dataSource);
		backslashEscapesModes.set(dataSource, modes);
		// A failed read is read again by the next check, so a passing outage does not stop every later request.
		modes.catch((): void => {
			backslashEscapesModes.delete(dataSource);
		});
	}

	const readModesResult: ReadonlyArray<string> = await modes;
	const offending: string | undefined = readModesResult.find((mode: string): boolean => mode.split(",").some((part: string): boolean => part.trim().toUpperCase() === NO_BACKSLASH_ESCAPES_MODE));

	if (offending !== undefined) {
		const message: string = `Controller "${controllerName}" reads a ${dataSource.options.type} DataSource whose sql_mode "${offending}" holds ${NO_BACKSLASH_ESCAPES_MODE}: the MySQL driver escapes a quote in a bound value with a backslash, which that mode reads as plain text, so a client value could end the string and run as SQL. Remove ${NO_BACKSLASH_ESCAPES_MODE} from the global sql_mode of the server and from the sql_mode each connection sets`;

		backslashEscapesLogger.error(message);

		throw ErrorException(message);
	}
}

/**
 * Reads the session sql_mode of one pooled connection and the global sql_mode of the server.
 * @param {DataSource} dataSource - Initialized MySQL or MariaDB DataSource.
 * @returns {Promise<ReadonlyArray<string>>} Both modes.
 */
async function readModes(dataSource: DataSource): Promise<ReadonlyArray<string>> {
	const rows: unknown = await dataSource.query("SELECT @@SESSION.sql_mode AS sessionMode, @@GLOBAL.sql_mode AS globalMode");
	const row: unknown = Array.isArray(rows) ? (rows as Array<unknown>)[0] : undefined;
	const record: Record<string, unknown> = row && typeof row === "object" ? (row as Record<string, unknown>) : {};

	return [record.sessionMode, record.globalMode].map((mode: unknown): string => (typeof mode === "string" ? mode : ""));
}
