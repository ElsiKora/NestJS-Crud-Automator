/**
 * Driver types as the TypeORM DataSource options name them.
 * Internal: the sets name the drivers a runtime rule depends on.
 */
export const DATABASE_DRIVER_TYPE_CONSTANT: {
	readonly NODE_POSTGRES: ReadonlySet<string>;
	readonly SQLITE_FAMILY: ReadonlySet<string>;
} = Object.freeze({
	// Drivers whose queries run through node-postgres, which serializes a `Date` parameter through the local offset truncated to whole minutes.
	NODE_POSTGRES: new Set<string>(["cockroachdb", "postgres"]),
	// Drivers that run every query runner on one connection, so two open transactions would be one, and that store a `Date` as UTC text.
	SQLITE_FAMILY: new Set<string>(["better-sqlite3", "capacitor", "cordova", "expo", "nativescript", "react-native", "sqljs"]),
});
