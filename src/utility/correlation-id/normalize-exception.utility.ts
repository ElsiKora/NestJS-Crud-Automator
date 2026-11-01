import type { ArgumentsHost, HttpException } from "@nestjs/common";
import type { HttpAdapterHost } from "@nestjs/core";

import { LoggerUtility } from "@utility/logger.utility";

import { CorrelationIDBuildException } from "./build-exception.utility";
import { CorrelationIDHttpHostResolve } from "./http-host.utility";

const normalizeLogger: LoggerUtility = LoggerUtility.getLogger("CorrelationIDNormalizeException");

/**
 * Converts what an exception filter caught into the HttpException that carries the correlation contract, and writes the `x-correlation-id` response header through the HTTP adapter.
 * A failure that already passed through CorrelationIDResponseBodyInterceptor is returned as is.
 * Outside an HTTP context there is no request to correlate, so the ID is generated and only appears in the body.
 * @param {unknown} exception - The value the filter caught.
 * @param {ArgumentsHost} host - The filter arguments host.
 * @param {HttpAdapterHost} httpAdapterHost - The application HTTP adapter host.
 * @returns {HttpException} The exception to answer with. The value it received stays in `cause`, which must not be sent, logged, or serialized.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/guides/error-handling | Guides - Error Handling}
 */
export function CorrelationIDNormalizeException(exception: unknown, host: ArgumentsHost, httpAdapterHost: HttpAdapterHost): HttpException {
	return CorrelationIDBuildException(exception, CorrelationIDHttpHostResolve(host, httpAdapterHost.httpAdapter), normalizeLogger);
}
