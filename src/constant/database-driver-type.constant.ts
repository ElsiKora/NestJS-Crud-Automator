/**
 * Driver types as the TypeORM DataSource options name them.
 * Internal: the sets name the drivers a runtime rule depends on.
 */
export const DATABASE_DRIVER_TYPE_CONSTANT: {
	readonly LIKE_BACKSLASH_ESCAPE: ReadonlySet<string>;
	readonly NODE_POSTGRES: ReadonlySet<string>;
	readonly ROW_LOCK_NAMES_TABLE: ReadonlySet<string>;
	readonly ROW_LOCK_UNSUPPORTED: ReadonlySet<string>;
	readonly SQLITE_FAMILY: ReadonlySet<string>;
} = Object.freeze({
	// Drivers whose database escapes a LIKE pattern with a backslash when the query names no ESCAPE clause. MySQL and MariaDB do so only without NO_BACKSLASH_ESCAPES, which a generated controller refuses at startup.
	LIKE_BACKSLASH_ESCAPE: new Set<string>(["aurora-mysql", "cockroachdb", "mariadb", "mysql", "postgres"]),
	// Drivers whose queries run through node-postgres, which serializes a `Date` parameter through the local offset truncated to whole minutes.
	NODE_POSTGRES: new Set<string>(["cockroachdb", "postgres"]),
	// Drivers whose row lock names the locked table (`FOR UPDATE OF`), because their plain `FOR UPDATE` refuses a query with an outer join.
	ROW_LOCK_NAMES_TABLE: new Set<string>(["aurora-postgres", "cockroachdb", "postgres"]),
	// Drivers TypeORM writes no pessimistic row lock for. They run every transaction on one connection, so no other transaction writes between a read and a later write of the same transaction.
	ROW_LOCK_UNSUPPORTED: new Set<string>(["better-sqlite3", "capacitor", "cordova", "expo", "nativescript", "react-native", "sqlite", "sqljs"]),
	// Drivers that run every query runner on one connection, so two open transactions would be one, and that store a `Date` as UTC text.
	SQLITE_FAMILY: new Set<string>(["better-sqlite3", "capacitor", "cordova", "expo", "nativescript", "react-native", "sqljs"]),
});
