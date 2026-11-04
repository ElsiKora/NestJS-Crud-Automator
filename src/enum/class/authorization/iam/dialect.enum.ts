/**
 * The SQL dialect an IAM scope is lowered to. Bootstrap reads it from the TypeORM DataSource of each IAM controller;
 * MariaDB is told from MySQL by its server version, because TypeORM reports both as `mysql`.
 */
export enum EApiAuthorizationIamDialect {
	// MariaDB, whose binary String comparison uses `utf8mb4_nopad_bin`.
	MARIADB = "mariadb",
	// MySQL, whose binary String comparison uses `utf8mb4_0900_bin`.
	MYSQL = "mysql",
	// No DataSource of the application maps the entity, or its driver has no lowering of its own: only the nodes every SQL database evaluates alike compile.
	PORTABLE = "portable",
	// PostgreSQL and CockroachDB.
	POSTGRES = "postgres",
	// The SQLite family.
	SQLITE = "sqlite",
	// A DataSource whose dialect could not be read, or DataSources of different dialects that map one entity: no node compiles, so every scope fails closed.
	UNRESOLVED = "unresolved",
}
