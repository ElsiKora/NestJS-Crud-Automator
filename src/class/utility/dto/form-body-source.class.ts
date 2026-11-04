const FORM_MEDIA_TYPES: ReadonlySet<string> = new Set<string>(["application/x-www-form-urlencoded", "multipart/form-data"]);
const SOURCES: WeakSet<object> = new WeakSet<object>();

/**
 * Remembers the objects of a form or multipart request body, whose fields are text on the wire, so `ApiPropertyNumber` and `ApiPropertyBoolean` convert their canonical text there as they do in a query.
 * Any other body is JSON, whose number and boolean fields must arrive as JSON numbers and booleans.
 */
export class DtoFormBodySource {
	/**
	 * Tells whether an object is a form or multipart body, or an object inside one.
	 * @param {unknown} value - Object that holds a request property, as class-transformer passes it to a transform.
	 * @returns {boolean} Whether the object came from a form or multipart body.
	 */
	public static has(value: unknown): boolean {
		return typeof value === "object" && value !== null && SOURCES.has(value);
	}

	/**
	 * Remembers the body and every object inside it when the request sends a form or multipart body.
	 * @param {Array<string> | string | undefined} contentType - `content-type` header of the request.
	 * @param {unknown} body - Parsed request body.
	 * @returns {void}
	 */
	public static mark(contentType: Array<string> | string | undefined, body: unknown): void {
		const mediaType: string | undefined = (Array.isArray(contentType) ? contentType[0] : contentType)?.split(";")[0]?.trim().toLowerCase();

		if (mediaType === undefined || !FORM_MEDIA_TYPES.has(mediaType) || typeof body !== "object" || body === null) {
			return;
		}

		const pending: Array<object> = [body];

		// A multipart parser points every field back at the body, so each object is taken once.
		for (let value: object | undefined = pending.pop(); value !== undefined; value = pending.pop()) {
			if (SOURCES.has(value)) {
				continue;
			}

			SOURCES.add(value);

			const children: Array<unknown> = Object.values(value);

			for (const child of children) {
				if (typeof child === "object" && child !== null && !SOURCES.has(child)) {
					pending.push(child);
				}
			}
		}
	}
}
