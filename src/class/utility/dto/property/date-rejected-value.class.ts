const REJECTED_TEXT: string = "Invalid Date";

/**
 * Stands in for a request date value the client sent outside the published form of its format.
 * It converts to `NaN` or `Invalid Date` text, so a transform that runs after `ApiPropertyDate`, such as `new Date(value)`, cannot turn it into a valid value, and the format validator refuses it in any decorator order.
 * JSON shows the value as sent.
 */
export class DtoPropertyDateRejectedValue {
	private readonly sent: unknown;

	/**
	 * @param {unknown} sent - The value as the client sent it.
	 */
	constructor(sent: unknown) {
		this.sent = sent;
		Object.freeze(this);
	}

	/**
	 * Converts to a primitive no date parser or number conversion reads as a value.
	 * @param {string} hint - Primitive the conversion asks for.
	 * @returns {number | string} `NaN` for a number, `Invalid Date` text otherwise.
	 */
	public [Symbol.toPrimitive](hint: string): number | string {
		return hint === "number" ? Number.NaN : REJECTED_TEXT;
	}

	/**
	 * Shows the value as sent when the instance is serialized.
	 * @returns {unknown} The value as the client sent it.
	 */
	public toJSON(): unknown {
		return this.sent;
	}
}
