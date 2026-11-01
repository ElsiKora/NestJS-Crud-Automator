// Columns that store an instant: PostgreSQL normalizes "timestamptz" to "timestamp with time zone".
const INSTANT_COLUMN_TYPES: ReadonlySet<string> = new Set<string>(["timestamptz", "timestamp with time zone"]);

// Columns that store a date and a time, whatever zone semantics their driver gives them.
const DATE_TIME_COLUMN_TYPES: ReadonlySet<string> = new Set<string>([...INSTANT_COLUMN_TYPES, "datetime", "datetime2", "datetimeoffset", "smalldatetime", "timestamp", "timestamp without time zone"]);

/**
 * Binds temporal query parameters the way their column stores them.
 * node-postgres serializes a Date through the local offset truncated to whole minutes, so an instant column binds canonical UTC text, while columns that store wall-clock text keep the Date that TypeORM writes into them.
 */
export class ApiControllerGeneratedTemporalParameterContract {
	/**
	 * Binds a date value of a column.
	 * @param {Date} value - Date to bind.
	 * @param {string} columnType - Column type as the driver normalizes it.
	 * @returns {Date | string} Canonical UTC text for an instant column, otherwise a copy of the date.
	 */
	public static bind(value: Date, columnType: string): Date | string {
		return this.isInstant(columnType) ? value.toISOString() : new Date(value);
	}

	/**
	 * Tells whether a column stores a date and a time.
	 * @param {string} columnType - Column type as the driver normalizes it.
	 * @returns {boolean} True for timestamp and datetime columns.
	 */
	public static isDateTime(columnType: string): boolean {
		return DATE_TIME_COLUMN_TYPES.has(columnType);
	}

	/**
	 * Tells whether a column stores an instant rather than a wall-clock date and time.
	 * @param {string} columnType - Column type as the driver normalizes it.
	 * @returns {boolean} True for timestamptz columns.
	 */
	public static isInstant(columnType: string): boolean {
		return INSTANT_COLUMN_TYPES.has(columnType);
	}
}
