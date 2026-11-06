import { beforeEach, expect, vi } from "vitest";

import { LoggerUtility } from "../../src/index";

/** The one body a body field that the path decides is refused with: the code only, as `FILTER_NOT_VALID`. */
export const BODY_PARAMETER_REFUSAL_BODY: Readonly<{ error: string; message: string; statusCode: number }> = Object.freeze({ error: "Bad Request", message: "PARAMETERS_NOT_VALID", statusCode: 400 });

/**
 * Expects the refusal of a body field that the path decides: the exact code-only body, and the log line that names the field and the rule.
 * The suite must call `WatchBodyParameterRefusals` first. `correlationID` and `timestamp` may be present, from the correlation interceptor or filter.
 * @param {unknown} body - Parsed response body.
 * @param {string} propertyName - Body property the log names.
 * @param {string} reason - Rule the log names.
 */
export function ExpectBodyParameterRefusal(body: unknown, propertyName: string, reason: string): void {
	// CorrelationIDResponseBodyInterceptor and CorrelationIDResponseBodyExceptionFilter add these two fields and nothing else
	const { correlationID: _correlationID, timestamp: _timestamp, ...codes }: Record<string, unknown> = body as Record<string, unknown>;

	expect(codes).toEqual(BODY_PARAMETER_REFUSAL_BODY);
	expect(readRefusalLines().at(-1)).toBe(`Body parameter refused: propertyName=${propertyName} reason=${reason}`);
}

/**
 * Watches the verbose log of the package before each test, so `ExpectBodyParameterRefusal` can read the field and the rule the route logged.
 * The spy passes every call through, so the log prints as before.
 */
export function WatchBodyParameterRefusals(): void {
	beforeEach(() => {
		if (vi.isMockFunction(LoggerUtility.prototype.verbose)) {
			vi.mocked(LoggerUtility.prototype.verbose).mockClear();
		} else {
			vi.spyOn(LoggerUtility.prototype, "verbose");
		}
	});
}

/**
 * Reads the body parameter refusals the package logged since the last test started.
 * @returns {Array<string>} Logged refusal lines.
 */
function readRefusalLines(): Array<string> {
	if (!vi.isMockFunction(LoggerUtility.prototype.verbose)) {
		throw new Error("WatchBodyParameterRefusals must run before ExpectBodyParameterRefusal");
	}

	return vi
		.mocked(LoggerUtility.prototype.verbose)
		.mock.calls.map((call: Array<unknown>): unknown => call[0])
		.filter((line: unknown): line is string => typeof line === "string" && line.startsWith("Body parameter refused: "));
}
