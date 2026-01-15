import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import type { FastifyRequest } from "fastify";
import type { Observable } from "rxjs";

import { randomUUID } from "node:crypto";

import { HttpException, HttpStatus, Injectable, InternalServerErrorException } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { FormatUnknownForLog } from "@utility/format-unknown-for-log.utility";
import { LoggerUtility } from "@utility/logger.utility";
import { catchError } from "rxjs/operators";

const interceptorLogger: LoggerUtility = LoggerUtility.getLogger("CorrelationIDResponseBodyInterceptor");

/**
 * Global interceptor that adds correlation IDs and timestamps to all error responses.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/interceptors | API Reference - Interceptors}
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/guides/error-handling | Guides - Error Handling}
 */
@Injectable()
export class CorrelationIDResponseBodyInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request: FastifyRequest = context.switchToHttp().getRequest<FastifyRequest>();
		const reply: FastifyReply = context.switchToHttp().getResponse<FastifyReply>();
		const rawCorrelationId: Array<string> | string | undefined = request.headers["x-correlation-id"];

		const headerCorrelationId: string | undefined = Array.isArray(rawCorrelationId) ? rawCorrelationId.find((value: string) => value.trim().length > 0) : rawCorrelationId;
		const normalizedCorrelationId: string | undefined = typeof headerCorrelationId === "string" ? headerCorrelationId.trim() : undefined;
		const correlationId: string = normalizedCorrelationId && normalizedCorrelationId.length > 0 ? normalizedCorrelationId : randomUUID();
		const requestMethod: string = (request.method as string | undefined) ?? "UNKNOWN_METHOD";
		const requestUrl: string = (request.url as string | undefined) ?? "UNKNOWN_URL";

		// Persist the resolved correlation ID for downstream loggers/middlewares
		(request.headers as unknown as Record<string, unknown>)["x-correlation-id"] = correlationId;
		(request as unknown as { correlationID?: string }).correlationID = correlationId;
		reply.header("x-correlation-id", correlationId);

		return next.handle().pipe(
			catchError((error: unknown) => {
				if (error instanceof ThrottlerException) {
					const errorResponse: object | string = error.getResponse();
					interceptorLogger.warn(`HTTP ${HttpStatus.TOO_MANY_REQUESTS} ${requestMethod} ${requestUrl} correlationID=${correlationId}`);

					let customErrorResponse: Record<string, unknown> = {};
					customErrorResponse.statusCode = HttpStatus.TOO_MANY_REQUESTS;

					if (typeof errorResponse === "object" && errorResponse != null) {
						customErrorResponse = { ...errorResponse };
					} else {
						customErrorResponse.message = errorResponse;
					}
					customErrorResponse.error = "Too Many Requests";
					customErrorResponse.timestamp = Date.now();
					customErrorResponse.correlationID = correlationId;

					throw new HttpException(customErrorResponse, error.getStatus());
				} else if (error instanceof HttpException) {
					const errorResponse: object | string = error.getResponse();
					const status: number = error.getStatus();
					const internalServerErrorStatus: number = HttpStatus.INTERNAL_SERVER_ERROR;

					if (status >= internalServerErrorStatus) {
						const errorStack: string | undefined = error instanceof Error ? error.stack : undefined;
						interceptorLogger.error(`HTTP ${status} ${requestMethod} ${requestUrl} correlationID=${correlationId}`, errorStack);

						const cause: unknown = (error as { cause?: unknown }).cause;

						if (cause instanceof Error) {
							interceptorLogger.error(`Cause: ${cause.name}: ${cause.message} correlationID=${correlationId}`, cause.stack);
						} else if (cause != null) {
							interceptorLogger.error(`Cause: ${FormatUnknownForLog(cause)} correlationID=${correlationId}`);
						}
					}

					let customErrorResponse: Record<string, unknown> = {};

					if (typeof errorResponse === "object" && errorResponse != null) {
						customErrorResponse = { ...errorResponse };
					} else {
						customErrorResponse.message = errorResponse;
					}
					customErrorResponse.correlationID = correlationId;
					customErrorResponse.timestamp = Date.now();

					throw new HttpException(customErrorResponse, status);
				} else {
					if (error instanceof Error) {
						interceptorLogger.error(`HTTP ${HttpStatus.INTERNAL_SERVER_ERROR} ${requestMethod} ${requestUrl} correlationID=${correlationId} (non-HttpException)`, error.stack);

						if (error.cause instanceof Error) {
							interceptorLogger.error(`Cause: ${error.cause.name}: ${error.cause.message} correlationID=${correlationId}`, error.cause.stack);
						} else if (error.cause != null) {
							interceptorLogger.error(`Cause: ${FormatUnknownForLog(error.cause)} correlationID=${correlationId}`);
						}
					} else {
						interceptorLogger.error(`HTTP ${HttpStatus.INTERNAL_SERVER_ERROR} ${requestMethod} ${requestUrl} correlationID=${correlationId} (non-Error thrown): ${FormatUnknownForLog(error)}`);
					}

					if (!(error instanceof Error)) {
						error = new InternalServerErrorException("Unknown error");
					}

					const internalError: HttpException | InternalServerErrorException = error as HttpException | InternalServerErrorException;
					const errorResponse: string = "Internal server error";
					const customErrorResponse: Record<string, unknown> = {};
					customErrorResponse.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
					customErrorResponse.message = errorResponse;
					customErrorResponse.error = "Internal server error";
					customErrorResponse.timestamp = Date.now();
					customErrorResponse.correlationID = correlationId;

					const status: number = "getStatus" in internalError && typeof internalError.getStatus === "function" ? internalError.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

					throw new HttpException(customErrorResponse, status);
				}
			}),
		);
	}
}
