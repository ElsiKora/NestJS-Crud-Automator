/* eslint-disable @elsikora/sonar/todo-tag */

// TODO: Implement check for all exceptions

import type { HttpException, Type } from "@nestjs/common";

import { EException } from "@enum/exception.enum";
import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	GatewayTimeoutException,
	GoneException,
	HttpVersionNotSupportedException,
	ImATeapotException,
	InternalServerErrorException,
	MethodNotAllowedException,
	NotAcceptableException,
	NotFoundException,
	NotImplementedException,
	PayloadTooLargeException,
	PreconditionFailedException,
	RequestTimeoutException,
	ServiceUnavailableException,
	UnauthorizedException,
	UnprocessableEntityException,
	UnsupportedMediaTypeException,
} from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";

const ExceptionMap: Record<EException, Type<HttpException> | undefined> = {
	[EException.BAD_REQUEST]: BadRequestException,
	[EException.CONFLICT]: ConflictException,
	[EException.EXPECTATION_FAILED]: undefined,
	[EException.FORBIDDEN]: ForbiddenException,
	[EException.GATEWAY_TIMEOUT]: GatewayTimeoutException,
	[EException.GONE]: GoneException,
	[EException.HTTP_VERSION_NOT_SUPPORTED]: HttpVersionNotSupportedException,
	[EException.IM_A_TEAPOT]: ImATeapotException,
	[EException.INTERNAL_SERVER_ERROR]: InternalServerErrorException,
	[EException.LENGTH_REQUIRED]: undefined,
	[EException.METHOD_NOT_ALLOWED]: MethodNotAllowedException,
	[EException.NETWORK_AUTHENTICATION_REQUIRED]: undefined,
	[EException.NOT_ACCEPTABLE]: NotAcceptableException,
	[EException.NOT_EXTENDED]: undefined,
	[EException.NOT_FOUND]: NotFoundException,
	[EException.NOT_IMPLEMENTED]: NotImplementedException,
	[EException.PAYLOAD_TOO_LARGE]: PayloadTooLargeException,
	[EException.PAYMENT_REQUIRED]: undefined,
	[EException.PRECONDITION_FAILED]: PreconditionFailedException,
	[EException.REQUEST_HEADER_FIELDS_TOO_LARGE]: undefined,
	[EException.REQUEST_TIMEOUT]: RequestTimeoutException,
	[EException.REQUEST_URI_TOO_LONG]: undefined,
	[EException.SERVICE_UNAVAILABLE]: ServiceUnavailableException,
	[EException.TOO_MANY_REQUESTS]: ThrottlerException,
	[EException.UNAUTHORIZED]: UnauthorizedException,
	[EException.UNPROCESSABLE_ENTITY]: UnprocessableEntityException,
	[EException.UNSUPPORTED_MEDIA_TYPE]: UnsupportedMediaTypeException,
	[EException.UPGRADE_REQUIRED]: undefined,
};

/**
 * Checks if an error is of a specific exception type
 * @param {unknown} error - The error to check
 * @param {EException} type - The exception type to compare against
 * @returns {boolean} True if the error is of the specified type, false otherwise
 */
export function IsErrorOfType(error: unknown, type: EException): boolean {
	const ExceptionClass: HttpException | undefined = ExceptionMap[type] as HttpException | undefined;

	if (!ExceptionClass) {
		return false;
	}

	if (!error || typeof error !== "object") {
		return false;
	}

	// @ts-ignore
	if (error instanceof ExceptionClass) {
		return true;
	}

	const errorObject: { name?: string } = error as { name?: string };

	return !!(errorObject.name && errorObject.name === ExceptionClass.name);
}
