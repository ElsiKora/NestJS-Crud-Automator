const ERROR_TYPE_TOKEN_PATTERN: RegExp = /^[A-Za-z][A-Za-z0-9]{0,63}$/u;
const MAXIMUM_VISITED_OBJECTS: number = 8;
const SQL_STATE_PATTERN: RegExp = /^[0-9A-Z]{5}$/u;

const ERROR_LINK_PROPERTIES: ReadonlyArray<"cause" | "code" | "driverError"> = Object.freeze(["code", "cause", "driverError"]);

/**
 * Formats bounded, non-secret error evidence for logs without reading executable properties.
 * @param {unknown} error - Error-like value to inspect.
 * @returns {string} Error type and optional validated SQLSTATE evidence.
 */
export function FormatErrorEvidenceForLog(error: unknown): string {
	const errorType: string = getErrorType(error);
	const sqlState: string | undefined = findSqlState(error);

	return sqlState ? `errorType=${errorType} sqlState=${sqlState}` : `errorType=${errorType}`;
}

/**
 * Finds the first validated SQLSTATE in the bounded error graph.
 * @param {unknown} error - Error-like root value.
 * @returns {string | undefined} Validated SQLSTATE when present.
 */
function findSqlState(error: unknown): string | undefined {
	if (!isObject(error)) {
		return undefined;
	}

	const pending: Array<object> = [error];
	const visited: WeakSet<object> = new WeakSet<object>();
	let index: number = 0;
	let visitedCount: number = 0;

	while (index < pending.length && visitedCount < MAXIMUM_VISITED_OBJECTS) {
		const candidate: object | undefined = pending[index];
		index += 1;

		if (!candidate || visited.has(candidate)) {
			continue;
		}

		visited.add(candidate);
		visitedCount += 1;

		for (const property of ERROR_LINK_PROPERTIES) {
			const value: unknown = getOwnDataProperty(candidate, property);

			if (property === "code" && typeof value === "string" && SQL_STATE_PATTERN.test(value)) {
				return value;
			}

			if (isObject(value)) {
				pending.push(value);
			}
		}
	}

	return undefined;
}

/**
 * Resolves a bounded ASCII type token without invoking an error accessor.
 * @param {unknown} error - Error-like value.
 * @returns {string} Safe error type token.
 */
function getErrorType(error: unknown): string {
	if (!isObject(error)) {
		return "UnknownError";
	}

	const ownName: unknown = getOwnDataProperty(error, "name");

	if (isErrorTypeToken(ownName)) {
		return ownName;
	}

	if (ownName !== undefined) {
		return "UnknownError";
	}

	try {
		const prototype: null | object = Object.getPrototypeOf(error) as null | object;

		if (prototype) {
			const constructor: unknown = getOwnDataProperty(prototype, "constructor");

			if (typeof constructor === "function") {
				const constructorName: unknown = getOwnDataProperty(constructor, "name");

				if (isErrorTypeToken(constructorName)) {
					return constructorName;
				}
			}
		}
	} catch {
		return "UnknownError";
	}

	return "UnknownError";
}

/**
 * Reads an own data property while rejecting accessors and hostile proxy traps.
 * @param {object} value - Object to inspect.
 * @param {PropertyKey} property - Own property to inspect.
 * @returns {unknown} Data-descriptor value or undefined.
 */
function getOwnDataProperty(value: object, property: PropertyKey): unknown {
	try {
		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, property);

		return descriptor && "value" in descriptor ? descriptor.value : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Tests whether a value is an allowed error-type token.
 * @param {unknown} value - Candidate token.
 * @returns {boolean} Whether the token is safe.
 */
function isErrorTypeToken(value: unknown): value is string {
	return typeof value === "string" && ERROR_TYPE_TOKEN_PATTERN.test(value);
}

/**
 * Tests whether a value can participate in descriptor-only traversal.
 * @param {unknown} value - Candidate value.
 * @returns {boolean} Whether the value is object-like.
 */
function isObject(value: unknown): value is object {
	return (typeof value === "object" && value !== null) || typeof value === "function";
}
