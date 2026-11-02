import { DATABASE_COLUMN_TYPE_CONSTANT } from "@constant/database-column-type.constant";

const MAXIMUM_EXACT_INSTANT_PRECISION: number = 3;

/**
 * Tells whether a JavaScript `Date` reproduces every value a date and time column stores, so a key in that column can be addressed by a `Date`.
 * An instant column must keep at most milliseconds. A `datetime` column, as SQLite, MySQL and MariaDB declare it, must keep at most milliseconds or declare no precision.
 * @param {string | undefined} columnType - Column type, as declared or as `driver.normalizeType` returns it.
 * @param {null | number | undefined} precision - Declared fractional second precision.
 * @returns {boolean} Whether every stored value round-trips through a `Date`.
 */
export function ApiControllerPathIsExactInstant(columnType: string | undefined, precision: null | number | undefined): boolean {
	const isMillisecondPrecision: boolean = typeof precision === "number" && precision >= 0 && precision <= MAXIMUM_EXACT_INSTANT_PRECISION;

	if (columnType !== undefined && DATABASE_COLUMN_TYPE_CONSTANT.INSTANT.has(columnType)) {
		return isMillisecondPrecision;
	}

	return columnType === "datetime" && (precision === undefined || precision === null || isMillisecondPrecision);
}
