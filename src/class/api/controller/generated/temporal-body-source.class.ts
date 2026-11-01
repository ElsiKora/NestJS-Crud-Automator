const SOURCES: WeakMap<Date, string> = new WeakMap<Date, string>();

/**
 * Keeps the request text of a date a body DTO parsed, because its zone and fraction digits are gone from the Date.
 */
export class ApiControllerGeneratedTemporalBodySource {
	/**
	 * Parses request text into the Date a body DTO holds.
	 * @param {string} text - Request text.
	 * @returns {Date} Parsed date, remembered with its text.
	 */
	public static parse(text: string): Date {
		const date: Date = new Date(text);

		SOURCES.set(date, text);

		return date;
	}

	/**
	 * Reads the request text of a date.
	 * @param {Date} date - Date a body DTO parsed.
	 * @returns {string | undefined} Its request text, if it came from one.
	 */
	public static read(date: Date): string | undefined {
		return SOURCES.get(date);
	}
}
