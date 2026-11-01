import { DatabaseTypeOrmAssertEffectiveWhere } from "@utility/database/typeorm/assert/effective-where.utility";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Rejects a WHERE expression of a single-row operation that carries no condition or that TypeORM would widen.
 * Without this check TypeORM reads a missing or empty WHERE as "match any row".
 * @template T The WHERE expression type
 * @param {T | undefined} where - WHERE expression passed to a TypeORM repository or query builder.
 * @returns {void}
 * @throws {Error} If the expression is missing, empty, or contains a condition that would be dropped or widened.
 */
export function DatabaseTypeOrmAssertRequiredWhere<T>(where: T | undefined): asserts where is T {
	DatabaseTypeOrmAssertEffectiveWhere(where);

	// The expression is now undefined, a plain object, or a non-empty array of branches
	if (where === undefined || Object.keys(where as object).length === 0) {
		throw ErrorException("WHERE criteria are required for a single-row operation");
	}
}
