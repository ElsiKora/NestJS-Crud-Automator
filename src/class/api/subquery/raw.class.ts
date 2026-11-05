import type { FindOperator } from "typeorm";

import { Raw } from "typeorm";

// The SQL builders of the `Raw` conditions the library writes itself, which a cursor list merges with its keyset predicate.
const API_SUBQUERY_RAW_SQL: WeakSet<object> = new WeakSet<object>();

/**
 * Writes the `Raw` conditions of the library's own subqueries and tells them from any other raw SQL. A SQL builder is
 * recorded here only when the library wrote it, so nothing a client sends can become one: a client value is never a
 * function, and every value in such a condition is a bound parameter.
 */
export class ApiSubqueryRaw {
	/**
	 * Writes a `Raw` condition and records its SQL builder as one the library wrote.
	 * @param {(columnAlias: string) => string} sql - Builds the condition from the column alias TypeORM passes.
	 * @param {Record<string, unknown>} parameters - Values the condition binds.
	 * @returns {FindOperator<unknown>} The `Raw` operator.
	 */
	public static create(sql: (columnAlias: string) => string, parameters: Record<string, unknown>): FindOperator<unknown> {
		API_SUBQUERY_RAW_SQL.add(sql);

		return Raw(sql, parameters);
	}

	/**
	 * Tells whether a `Raw` SQL builder is one the library wrote.
	 * @param {unknown} sql - The `_getSql` builder of a TypeORM `Raw` operator.
	 * @returns {boolean} Whether the library wrote the builder.
	 */
	public static isLibraryRaw(sql: unknown): boolean {
		return typeof sql === "function" && API_SUBQUERY_RAW_SQL.has(sql);
	}
}
