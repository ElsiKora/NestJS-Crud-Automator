var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { randomUUID } from "node:crypto";
import { HttpException, HttpStatus, Injectable, InternalServerErrorException } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { catchError } from "rxjs/operators";
let CorrelationIDResponseBodyInterceptor = class CorrelationIDResponseBodyInterceptor {
    intercept(context, next) {
        return next.handle().pipe(catchError((error) => {
            if (error instanceof ThrottlerException) {
                const request = context.switchToHttp().getRequest();
                let correlationId = request.headers["x-correlation-id"];
                const errorResponse = error.getResponse();
                if (correlationId == undefined) {
                    correlationId = randomUUID();
                }
                let customErrorResponse = {};
                customErrorResponse.statusCode = HttpStatus.TOO_MANY_REQUESTS;
                if (typeof errorResponse === "object" && errorResponse != null) {
                    customErrorResponse = { ...errorResponse };
                }
                else {
                    customErrorResponse.message = errorResponse;
                }
                customErrorResponse.error = "Too Many Requests";
                customErrorResponse.timestamp = Date.now();
                customErrorResponse.correlationID = correlationId;
                throw new HttpException(customErrorResponse, error.getStatus());
            }
            else if (error instanceof HttpException) {
                const request = context.switchToHttp().getRequest();
                let correlationId = request.headers["x-correlation-id"];
                const errorResponse = error.getResponse();
                if (correlationId == undefined) {
                    correlationId = randomUUID();
                }
                let customErrorResponse = {};
                if (typeof errorResponse === "object" && errorResponse != null) {
                    customErrorResponse = { ...errorResponse };
                }
                else {
                    customErrorResponse.message = errorResponse;
                }
                customErrorResponse.correlationID = correlationId;
                customErrorResponse.timestamp = Date.now();
                throw new HttpException(customErrorResponse, error.getStatus());
            }
            else {
                const request = context.switchToHttp().getRequest();
                let correlationId = request.headers["x-correlation-id"];
                if (correlationId == undefined) {
                    correlationId = randomUUID();
                }
                if (!(error instanceof Error)) {
                    error = new InternalServerErrorException("Unknown error");
                }
                const internalError = error;
                const errorResponse = "Internal server error";
                const customErrorResponse = {};
                customErrorResponse.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
                customErrorResponse.message = errorResponse;
                customErrorResponse.error = "Internal server error";
                customErrorResponse.timestamp = Date.now();
                customErrorResponse.correlationID = correlationId;
                const status = "getStatus" in internalError && typeof internalError.getStatus === "function" ? internalError.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
                throw new HttpException(customErrorResponse, status);
            }
        }));
    }
};
CorrelationIDResponseBodyInterceptor = __decorate([
    Injectable()
], CorrelationIDResponseBodyInterceptor);
export { CorrelationIDResponseBodyInterceptor };
//# sourceMappingURL=correlation-id-response-body.interceptor.js.map