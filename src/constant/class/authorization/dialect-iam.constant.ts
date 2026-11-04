const COCKROACH_INTEGER_BITS: number = 64;
const DOUBLE_MAX_DIGITS: number = 15;
const DOUBLE_MAX_EXPONENT: number = 308;
const DOUBLE_MIN_ZEROS: number = 306;
const MILLISECOND_DIGITS: number = 3;
const MYSQL_AUTO_DATE_PRECISION: number = 6;
const MYSQL_MAX_DECIMAL_DIGITS: number = 65;
const MYSQL_MAX_DECIMAL_SCALE: number = 30;
const POSTGRES_DEFAULT_PRECISION: number = 6;
const REAL_MAX_DIGITS: number = 6;
const REAL_MAX_EXPONENT: number = 38;
const REAL_MIN_ZEROS: number = 36;

/**
 * What the IAM dialect registry reads from a DataSource and its server, and what the dialect lowerers rely on.
 * Internal: the dialect registry and the lowerers are its only users.
 */
export const AUTHORIZATION_IAM_DIALECT_CONSTANT: {
	readonly COCKROACH_INTEGER_BITS: number;
	readonly DOUBLE_MAX_DIGITS: number;
	readonly DOUBLE_MAX_MAGNITUDE: string;
	readonly DOUBLE_MIN_MAGNITUDE: string;
	readonly MARIADB_BINARY_COLLATION: string;
	readonly MARIADB_BINARY_COLLATION_SINCE: string;
	readonly MILLISECOND_DIGITS: number;
	readonly MYSQL_AUTO_DATE_PRECISION: number;
	readonly MYSQL_BINARY_COLLATION: string;
	readonly MYSQL_BINARY_COLLATION_SINCE: string;
	readonly MYSQL_CONNECTION_CHARSET: string;
	readonly MYSQL_DECIMAL_TYPES: ReadonlySet<string>;
	readonly MYSQL_DOUBLE_TYPES: ReadonlySet<string>;
	readonly MYSQL_DRIVER_TYPES: ReadonlySet<string>;
	readonly MYSQL_MAX_DECIMAL_DIGITS: number;
	readonly MYSQL_MAX_DECIMAL_SCALE: number;
	readonly MYSQL_PROBE_QUERY: string;
	readonly POSTGRES_CANONICAL_UUID_PATTERN: RegExp;
	readonly POSTGRES_DEFAULT_PRECISION: number;
	readonly REAL_MAX_DIGITS: number;
	readonly REAL_MAX_MAGNITUDE: string;
	readonly REAL_MIN_MAGNITUDE: string;
} = Object.freeze({
	// Bits of an integer of CockroachDB that names no size.
	COCKROACH_INTEGER_BITS,
	// Significant digits a double compares exactly.
	DOUBLE_MAX_DIGITS,
	// Largest magnitude a double holds without leaving its normal range, as decimal text.
	DOUBLE_MAX_MAGNITUDE: `1${"0".repeat(DOUBLE_MAX_EXPONENT)}`,
	// Smallest magnitude a double holds with all its digits, as decimal text.
	DOUBLE_MIN_MAGNITUDE: `0.${"0".repeat(DOUBLE_MIN_ZEROS)}1`,
	// NO PAD binary collation of MariaDB: code-point equality where trailing spaces count.
	MARIADB_BINARY_COLLATION: "utf8mb4_nopad_bin",
	// First MariaDB version with the collation.
	MARIADB_BINARY_COLLATION_SINCE: "10.2.2",
	// Fraction digits of the milliseconds a date reads back with.
	MILLISECOND_DIGITS,
	// Fraction digits TypeORM creates a `createDate`, `updateDate` or `deleteDate` column of MySQL with.
	MYSQL_AUTO_DATE_PRECISION,
	// NO PAD binary collation of MySQL 8: `utf8mb4_bin` is PAD SPACE, so it would ignore trailing spaces.
	MYSQL_BINARY_COLLATION: "utf8mb4_0900_bin",
	// First MySQL version with the collation.
	MYSQL_BINARY_COLLATION_SINCE: "8.0.17",
	// Connection charset that carries every code point of a bound value to the server.
	MYSQL_CONNECTION_CHARSET: "utf8mb4",
	// Exact decimal types of the MySQL family.
	MYSQL_DECIMAL_TYPES: new Set<string>(["dec", "decimal", "fixed", "numeric"]),
	// Double types of the MySQL family.
	MYSQL_DOUBLE_TYPES: new Set<string>(["double", "double precision", "real"]),
	// Driver types of the MySQL family; TypeORM reports a MariaDB server behind `mysql` as `mysql`.
	MYSQL_DRIVER_TYPES: new Set<string>(["mariadb", "mysql"]),
	// Digits of the largest DECIMAL of the MySQL family.
	MYSQL_MAX_DECIMAL_DIGITS,
	// Fraction digits of the largest DECIMAL of the MySQL family.
	MYSQL_MAX_DECIMAL_SCALE,
	// The one-time version probe of a MySQL-family DataSource.
	MYSQL_PROBE_QUERY: "SELECT VERSION() AS version, @@character_set_connection AS charset",
	// The text PostgreSQL and CockroachDB read a `uuid` back as: lower-case hexadecimal in 8-4-4-4-12 groups.
	POSTGRES_CANONICAL_UUID_PATTERN: /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/u,
	// Fraction digits of a PostgreSQL timestamp that names none.
	POSTGRES_DEFAULT_PRECISION,
	// Significant digits a PostgreSQL real compares exactly.
	REAL_MAX_DIGITS,
	// Largest magnitude a real holds without leaving its normal range, as decimal text.
	REAL_MAX_MAGNITUDE: `1${"0".repeat(REAL_MAX_EXPONENT)}`,
	// Smallest magnitude a real holds with all its digits, as decimal text.
	REAL_MIN_MAGNITUDE: `0.${"0".repeat(REAL_MIN_ZEROS)}1`,
});
