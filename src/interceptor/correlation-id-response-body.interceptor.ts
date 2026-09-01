import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import type { FastifyRequest } from "fastify";
import type { Observable } from "rxjs";

import { randomUUID } from "node:crypto";

import { HttpException, HttpStatus, Injectable, InternalServerErrorException } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { FormatErrorEvidenceForLog } from "@utility/error/evidence-for-log.utility";
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

		// Persist the resolved correlation ID for downstream loggers/middlewares
		(request.headers as unknown as Record<string, unknown>)["x-correlation-id"] = correlationId;
		(request as unknown as { correlationID?: string }).correlationID = correlationId;
		reply.header("x-correlation-id", correlationId);

		return next.handle().pipe(
			catchError((error: unknown) => {
				if (error instanceof ThrottlerException) {
					const errorResponse: object | string = error.getResponse();
					interceptorLogger.warn(`HTTP ${HttpStatus.TOO_MANY_REQUESTS} rateLimited`);

					let customErrorResponse: Record<string, unknown> = { statusCode: HttpStatus.TOO_MANY_REQUESTS };

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
					const status: HttpStatus = error.getStatus();

					if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
						interceptorLogger.error(`HTTP ${status} ${FormatErrorEvidenceForLog(error)}`);
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
					interceptorLogger.error(`HTTP ${HttpStatus.INTERNAL_SERVER_ERROR} ${FormatErrorEvidenceForLog(error)}`);

					if (!(error instanceof Error)) {
						error = new InternalServerErrorException("Unknown error");
					}

					const internalError: HttpException | InternalServerErrorException = error as HttpException | InternalServerErrorException;
					const errorResponse: string = "Internal server error";
					const customErrorResponse: Record<string, unknown> = { correlationID: correlationId, error: "Internal server error", message: errorResponse, statusCode: HttpStatus.INTERNAL_SERVER_ERROR, timestamp: Date.now() };

					const status: number = "getStatus" in internalError && typeof internalError.getStatus === "function" ? internalError.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

					throw new HttpException(customErrorResponse, status);
				}
			}),
		);
	}
}
