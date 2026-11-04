/**
 * What the IAM dialect registry reads from a DataSource and its server.
 * Internal: the dialect registry is its only user.
 */
export const AUTHORIZATION_IAM_DIALECT_CONSTANT: {
	readonly MARIADB_BINARY_COLLATION: string;
	readonly MARIADB_BINARY_COLLATION_SINCE: string;
	readonly MYSQL_BINARY_COLLATION: string;
	readonly MYSQL_BINARY_COLLATION_SINCE: string;
	readonly MYSQL_CONNECTION_CHARSET: string;
	readonly MYSQL_DRIVER_TYPES: ReadonlySet<string>;
	readonly MYSQL_PROBE_QUERY: string;
} = Object.freeze({
	// NO PAD binary collation of MariaDB: code-point equality where trailing spaces count.
	MARIADB_BINARY_COLLATION: "utf8mb4_nopad_bin",
	// First MariaDB version with the collation.
	MARIADB_BINARY_COLLATION_SINCE: "10.2.2",
	// NO PAD binary collation of MySQL 8: `utf8mb4_bin` is PAD SPACE, so it would ignore trailing spaces.
	MYSQL_BINARY_COLLATION: "utf8mb4_0900_bin",
	// First MySQL version with the collation.
	MYSQL_BINARY_COLLATION_SINCE: "8.0.17",
	// Connection charset that carries every code point of a bound value to the server.
	MYSQL_CONNECTION_CHARSET: "utf8mb4",
	// Driver types of the MySQL family; TypeORM reports a MariaDB server behind `mysql` as `mysql`.
	MYSQL_DRIVER_TYPES: new Set<string>(["mariadb", "mysql"]),
	// The one-time version probe of a MySQL-family DataSource.
	MYSQL_PROBE_QUERY: "SELECT VERSION() AS version, @@character_set_connection AS charset",
});
