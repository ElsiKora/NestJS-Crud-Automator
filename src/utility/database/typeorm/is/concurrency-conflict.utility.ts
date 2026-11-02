import { QueryFailedError } from "typeorm";

const MYSQL_MARIADB_DEADLOCK_ERRNO: number = 1213;
const MARIADB_SNAPSHOT_CONFLICT_ERRNO: number = 1020;
const POSTGRES_CONCURRENCY_CONFLICT_CODES: ReadonlySet<unknown> = new Set<unknown>(["40001", "40P01"]);

/**
 * Detects whether the database ended a transaction because it lost a race against another one, so the same request can succeed when it is sent again.
 * @param {unknown} error - Error thrown by TypeORM
 * @returns {boolean} True for a deadlock or a snapshot conflict on PostgreSQL, MySQL or MariaDB
 */
export function DatabaseTypeOrmIsConcurrencyConflict(error: unknown): boolean {
	if (!(error instanceof QueryFailedError)) {
		return false;
	}

	const { code, errno }: { code?: unknown; errno?: unknown } = error.driverError as { code?: unknown; errno?: unknown };

	return POSTGRES_CONCURRENCY_CONFLICT_CODES.has(code) || errno === MYSQL_MARIADB_DEADLOCK_ERRNO || errno === MARIADB_SNAPSHOT_CONFLICT_ERRNO;
}
