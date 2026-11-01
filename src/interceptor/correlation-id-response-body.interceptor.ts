import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Observable } from "rxjs";

import { Injectable } from "@nestjs/common";
import { CorrelationIDBuildException } from "@utility/correlation-id/build-exception.utility";
import { CorrelationIDResolve } from "@utility/correlation-id/resolve.utility";
import { LoggerUtility } from "@utility/logger.utility";
import { catchError } from "rxjs/operators";

const interceptorLogger: LoggerUtility = LoggerUtility.getLogger("CorrelationIDResponseBodyInterceptor");

/**
 * Global interceptor that adds correlation IDs and timestamps to error responses from the handler chain.
 * Guards and middleware run before interceptors, so register CorrelationIDResponseBodyExceptionFilter next to it to give their errors the same contract.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/interceptors | API Reference - Interceptors}
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/guides/error-handling | Guides - Error Handling}
 */
@Injectable()
export class CorrelationIDResponseBodyInterceptor implements NestInterceptor {
	// One warning per instance: a gateway or RPC handler would otherwise log on every message
	private hasWarnedOutsideHttp: boolean = false;

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		if (context.getType() !== "http") {
			if (!this.hasWarnedOutsideHttp) {
				this.hasWarnedOutsideHttp = true;
				interceptorLogger.warn(`Not an HTTP context (${context.getType()}): the call passes without the correlation contract`);
			}

			return next.handle();
		}

		const request: FastifyRequest = context.switchToHttp().getRequest<FastifyRequest>();
		const reply: FastifyReply = context.switchToHttp().getResponse<FastifyReply>();

		const correlationId: string = CorrelationIDResolve(request, (value: string) => {
			reply.header("x-correlation-id", value);
		});

		return next.handle().pipe(
			catchError((error: unknown) => {
				throw CorrelationIDBuildException(error, correlationId, interceptorLogger);
			}),
		);
	}
}
