import type { EApiAuthorizationIamDialect } from "@enum/class/authorization";

/**
 * The SQL dialect of the DataSource an IAM resource entity is read from, with what its lowering depends on.
 */
export interface IApiAuthorizationIamDialect {
	// MySQL and MariaDB: the NO PAD binary collation String comparisons use. Absent when the server has none or the connection charset is not `utf8mb4`, so String comparisons fail closed.
	binaryCollation?: string;
	// Driver type the TypeORM DataSource options name, such as `postgres` or `mysql`.
	driverType?: string;
	// Dialect the scope is lowered to.
	type: EApiAuthorizationIamDialect;
	// Server version the version probe read, for MySQL and MariaDB.
	version?: string;
}
