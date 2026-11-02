const DECIMAL_COLUMN_TYPES: ReadonlySet<string> = new Set<string>(["dec", "decimal", "double", "double precision", "fixed", "float", "float4", "float64", "float8", "money", "number", "numeric", "real", "smalldecimal", "smallmoney"]);
const INTEGER_COLUMN_TYPES: ReadonlySet<string> = new Set<string>(["bigint", "int", "int2", "int4", "int64", "int8", "integer", "long", "mediumint", "smallint", "tinyint", "unsigned big int"]);

/**
 * Tells whether a database reads a column as a decimal, so many spellings such as `1.5` and `1.50` find one row and no text comparison is safe.
 * @param {unknown} type - Column type as declared to TypeORM.
 * @returns {boolean} Whether the column holds a decimal or a floating point number.
 */
export function ApiControllerParametersIsDecimalColumn(type: unknown): boolean {
	return typeof type === "string" && DECIMAL_COLUMN_TYPES.has(type.toLowerCase());
}

/**
 * Tells whether a database reads a column as an integer, so a text with leading zeros finds the row of the integer it spells.
 * A column declared with `Number`, or a generated increment, is an integer column in every TypeORM driver.
 * @param {unknown} type - Column type as declared to TypeORM.
 * @returns {boolean} Whether the column holds an integer.
 */
export function ApiControllerParametersIsIntegerColumn(type: unknown): boolean {
	return type === Number || (typeof type === "string" && INTEGER_COLUMN_TYPES.has(type.toLowerCase()));
}
