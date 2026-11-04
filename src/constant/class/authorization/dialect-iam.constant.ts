/**
 * What the IAM dialect registry reads from a DataSource and its server, and what the dialect lowerers rely on.
 * Internal: the dialect registry and the lowerers are its only users.
 */
export const AUTHORIZATION_IAM_DIALECT_CONSTANT: {
	readonly MARIADB_BINARY_COLLATION: string;
	readonly MARIADB_BINARY_COLLATION_SINCE: string;
	readonly MYSQL_BINARY_COLLATION: string;
	readonly MYSQL_BINARY_COLLATION_SINCE: string;
	readonly MYSQL_CONNECTION_CHARSET: string;
	readonly MYSQL_DRIVER_TYPES: ReadonlySet<string>;
	readonly MYSQL_PROBE_QUERY: string;
	readonly POSTGRES_CANONICAL_UUID_PATTERN: RegExp;
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
	// The text PostgreSQL and CockroachDB read a `uuid` back as: lower-case hexadecimal in 8-4-4-4-12 groups.
	POSTGRES_CANONICAL_UUID_PATTERN: /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/u,
});
