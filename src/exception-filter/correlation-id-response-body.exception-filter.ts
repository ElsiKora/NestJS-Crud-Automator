import type { ServerResponse } from "node:http";

import type { ArgumentsHost, ExceptionFilter, HttpException } from "@nestjs/common";
import type { AbstractHttpAdapter } from "@nestjs/core";

import { Catch } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { CorrelationIDBuildException } from "@utility/correlation-id/build-exception.utility";
import { CorrelationIDHttpHostIsSent, CorrelationIDHttpHostResolve } from "@utility/correlation-id/http-host.utility";
import { LoggerUtility } from "@utility/logger.utility";

const exceptionFilterLogger: LoggerUtility = LoggerUtility.getLogger("CorrelationIDResponseBodyExceptionFilter");

/**
 * Global filter that answers HTTP failures raised outside the handler chain with the correlation contract, such as exceptions from guards and middleware.
 * Failures that passed through CorrelationIDResponseBodyInterceptor are sent unchanged. It acts only in an HTTP context and must not be applied to gateways.
 * Register it before any filter of your own, because Nest runs only the last registered matching filter.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/interceptors | API Reference - Interceptors}
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/guides/error-handling | Guides - Error Handling}
 */
@Catch()
export class CorrelationIDResponseBodyExceptionFilter implements ExceptionFilter {
	public constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

	public catch(exception: unknown, host: ArgumentsHost): void {
		const httpAdapter: AbstractHttpAdapter | undefined = this.httpAdapterHost.httpAdapter as AbstractHttpAdapter | undefined;

		// Returning nothing hands the failure back to the default RPC handler, while a gateway filter that returns nothing answers nothing
		if (host.getType() !== "http") {
			exceptionFilterLogger.warn(`Not an HTTP context (${host.getType()}): the failure gets no correlation contract`);

			return;
		}

		if (!httpAdapter) {
			return;
		}

		const response: unknown = host.getArgByIndex<unknown>(1);
		const normalizedException: HttpException = CorrelationIDBuildException(exception, CorrelationIDHttpHostResolve(host, httpAdapter), exceptionFilterLogger);

		if (CorrelationIDHttpHostIsSent(httpAdapter, response)) {
			endNativeResponse(response);

			return;
		}

		httpAdapter.reply(response, normalizedException.getResponse(), normalizedException.getStatus());
	}
}

/**
 * Ends a native response whose headers were sent but whose body was not finished, so the connection does not hang.
 * @param {unknown} response - The adapter response or the native response.
 * @returns {void}
 */
function endNativeResponse(response: unknown): void {
	const nativeResponse: Partial<ServerResponse> = response as Partial<ServerResponse>;

	if (typeof nativeResponse.end === "function" && nativeResponse.writableEnded === false) {
		nativeResponse.end();
	}
}
