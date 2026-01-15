/**
 * Formats unknown values safely for logs (avoids "[object Object]" and circular JSON issues).
 * @param {unknown} value - Value to format
 * @returns {string} String representation suitable for logs
 */
export function FormatUnknownForLog(value: unknown): string {
	if (typeof value === "string") {
		return value;
	}

	if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
		return String(value);
	}

	if (value === null) {
		return "null";
	}

	if (value === undefined) {
		return "undefined";
	}

	try {
		const json: string | undefined = JSON.stringify(value);

		return json ?? Object.prototype.toString.call(value);
	} catch {
		return Object.prototype.toString.call(value);
	}
}
