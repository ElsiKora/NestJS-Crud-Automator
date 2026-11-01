import { CORRELATION_ID_CONSTANT } from "@constant/correlation-id.constant";

/**
 * Reads the client `x-correlation-id` header value.
 * A value is accepted only when it is one header of 1 to 128 characters of `[A-Za-z0-9._:-]`, without trimming.
 * @param {Array<string> | string | undefined} value - Raw `x-correlation-id` request header value.
 * @returns {string | undefined} The accepted client ID, otherwise undefined so the caller generates one.
 */
export function CorrelationIDReadHeader(value: Array<string> | string | undefined): string | undefined {
	return typeof value === "string" && CORRELATION_ID_CONSTANT.PATTERN.test(value) ? value : undefined;
}
