import { randomUUID } from "node:crypto";

import { HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";

import { catchError } from "rxjs/operators";

import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { Observable } from "rxjs";

@Injectable()
export class CorrelationIDResponseBodyInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		return next.handle().pipe(
			catchError((error: unknown) => {
				console.log("FOUND ERROR", error, error instanceof HttpException);
				console.log("Error constructor:", (error as any).constructor.name);
				console.log("Error instanceof Error:", error instanceof Error);
				console.log("Error instanceof HttpException:", error instanceof HttpException);
				console.log("Error instanceof NotFoundException:", error instanceof NotFoundException);
				console.log("Error properties:", Object.keys(error as any));

				if (error instanceof ThrottlerException) {
					const request: FastifyRequest = context.switchToHttp().getRequest<FastifyRequest>();
					let correlationId: string = request.headers["x-correlation-id"] as string;
					const errorResponse: object | string = error.getResponse();

					if (correlationId === undefined) {
						correlationId = randomUUID();
					}

					let customErrorResponse: Record<string, any> = {};
					customErrorResponse.statusCode = HttpStatus.TOO_MANY_REQUESTS;

					if (typeof errorResponse === "object" && errorResponse !== null) {
						customErrorResponse = { ...errorResponse };
					} else {
						customErrorResponse.message = errorResponse;
					}
					customErrorResponse.error = "Too Many Requests";
					customErrorResponse.timestamp = Date.now();
					customErrorResponse.correlationID = correlationId;

					throw new HttpException(customErrorResponse, error.getStatus());
				} else if (error instanceof HttpException) {
					const request: FastifyRequest = context.switchToHttp().getRequest<FastifyRequest>();
					let correlationId: string = request.headers["x-correlation-id"] as string;
					const errorResponse: object | string = error.getResponse();

					if (correlationId === undefined) {
						correlationId = randomUUID();
					}

					let customErrorResponse: Record<string, any> = {};

					if (typeof errorResponse === "object" && errorResponse !== null) {
						customErrorResponse = { ...errorResponse };
					} else {
						customErrorResponse.message = errorResponse;
					}
					customErrorResponse.correlationID = correlationId;
					customErrorResponse.timestamp = Date.now();

					console.log("CUSTOM ERROR", customErrorResponse);

					throw new HttpException(customErrorResponse, error.getStatus());
				} else {
					console.log("TYT BLYA?");
					const request: FastifyRequest = context.switchToHttp().getRequest<FastifyRequest>();
					let correlationId: string = request.headers["x-correlation-id"] as string;

					if (correlationId === undefined) {
						correlationId = randomUUID();
					}

					if (!(error instanceof Error)) {
						error = new InternalServerErrorException("Unknown error");
					}

					const internalError: HttpException | InternalServerErrorException = error as HttpException | InternalServerErrorException;
					const errorResponse: string = "Internal server error";
					const customErrorResponse: Record<string, any> = {};
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
