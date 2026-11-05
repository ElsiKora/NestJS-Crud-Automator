import type { EApiAuthorizationIamDialect } from "@enum/class/authorization";
import type { DataSource } from "typeorm";

/**
 * The SQL dialect of the DataSource an IAM resource entity is read from, with what its lowering depends on.
 */
export interface IApiAuthorizationIamDialect {
	// MySQL and MariaDB: the NO PAD binary collation String comparisons use. Absent when the server has none or the connection charset is not `utf8mb4`, so String comparisons fail closed.
	binaryCollation?: string;
	// The one DataSource that reads the resource entity: a key through a to-many relation compiles its subquery from its entity metadata. Absent when none or several do, and such a key then fails closed.
	dataSource?: DataSource;
	// Driver type the TypeORM DataSource options name, such as `postgres` or `mysql`.
	driverType?: string;
	// Dialect the scope is lowered to.
	type: EApiAuthorizationIamDialect;
	// Server version the version probe read, for MySQL and MariaDB.
	version?: string;
}
