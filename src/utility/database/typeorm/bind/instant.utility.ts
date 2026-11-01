import type { ValueTransformer } from "typeorm";

import { DATABASE_COLUMN_TYPE_CONSTANT } from "@constant/database-column-type.constant";
import { DATABASE_DRIVER_TYPE_CONSTANT } from "@constant/database-driver-type.constant";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Prepares a query parameter of a column the way TypeORM would for a find condition, so the caller binds it without the column transformer.
 * The value goes through the column transformers once, in order, whatever it is.
 * A `Date` they yield for an instant column on PostgreSQL or CockroachDB becomes canonical UTC text, because node-postgres binds a `Date` through a local offset truncated to whole minutes.
 * Other drivers and other column types keep what the transformers return.
 * @param {unknown} value - Parameter value as the entity holds it
 * @param {string} columnType - Column type as the driver normalizes it
 * @param {string} driverType - Driver type as the DataSource options name it
 * @param {Array<ValueTransformer> | ValueTransformer} [transformer] - Transformer of the column
 * @returns {unknown} Value to bind as it is
 * @throws {Error} When the value is an invalid `Date`
 */
export function DatabaseTypeOrmBindInstant(value: unknown, columnType: string, driverType: string, transformer?: Array<ValueTransformer> | ValueTransformer): unknown {
	if (value instanceof Date && Number.isNaN(value.getTime())) {
		throw ErrorException("Cannot bind an invalid Date as a query parameter");
	}

	let transformed: unknown = value;

	for (const columnTransformer of transformer ? [transformer].flat() : []) {
		transformed = columnTransformer.to(transformed) as unknown;
	}

	return transformed instanceof Date && DATABASE_COLUMN_TYPE_CONSTANT.INSTANT.has(columnType) && DATABASE_DRIVER_TYPE_CONSTANT.NODE_POSTGRES.has(driverType) ? transformed.toISOString() : transformed;
}
