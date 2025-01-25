// TODO: Implement check for all exceptions

import {
	NotFoundException,
	UnauthorizedException,
	ForbiddenException,
	BadRequestException,
	ConflictException,
	InternalServerErrorException,
	ServiceUnavailableException,
	GatewayTimeoutException,
	PayloadTooLargeException,
	NotImplementedException,
	NotAcceptableException,
	PreconditionFailedException,
	RequestTimeoutException,
	UnsupportedMediaTypeException,
	UnprocessableEntityException,
	MethodNotAllowedException,
	GoneException,
	ImATeapotException,
	HttpVersionNotSupportedException,
} from "@nestjs/common";

import { ThrottlerException } from "@nestjs/throttler";
import {EException} from "../enum";

const ExceptionMap: Record<EException, any> = {
	[EException.NOT_FOUND]: NotFoundException,
	[EException.UNAUTHORIZED]: UnauthorizedException,
	[EException.FORBIDDEN]: ForbiddenException,
	[EException.BAD_REQUEST]: BadRequestException,
	[EException.CONFLICT]: ConflictException,
	[EException.INTERNAL_SERVER_ERROR]: InternalServerErrorException,
	[EException.SERVICE_UNAVAILABLE]: ServiceUnavailableException,
	[EException.GATEWAY_TIMEOUT]: GatewayTimeoutException,
	[EException.PAYLOAD_TOO_LARGE]: PayloadTooLargeException,
	[EException.TOO_MANY_REQUESTS]: ThrottlerException,
	[EException.NOT_IMPLEMENTED]: NotImplementedException,
	[EException.NOT_ACCEPTABLE]: NotAcceptableException,
	[EException.NOT_EXTENDED]: undefined,
	[EException.LENGTH_REQUIRED]: undefined,
	[EException.PRECONDITION_FAILED]: PreconditionFailedException,
	[EException.REQUEST_HEADER_FIELDS_TOO_LARGE]: undefined,
	[EException.REQUEST_TIMEOUT]: RequestTimeoutException,
	[EException.REQUEST_URI_TOO_LONG]: undefined,
	[EException.UNSUPPORTED_MEDIA_TYPE]: UnsupportedMediaTypeException,
	[EException.UPGRADE_REQUIRED]: undefined,
	[EException.UNPROCESSABLE_ENTITY]: UnprocessableEntityException,
	[EException.PAYMENT_REQUIRED]: undefined,
	[EException.METHOD_NOT_ALLOWED]: MethodNotAllowedException,
	[EException.GONE]: GoneException,
	[EException.EXPECTATION_FAILED]: undefined,
	[EException.IM_A_TEAPOT]: ImATeapotException,
	[EException.HTTP_VERSION_NOT_SUPPORTED]: HttpVersionNotSupportedException,
	[EException.NETWORK_AUTHENTICATION_REQUIRED]: undefined,
};

export function IsErrorOfType(error: unknown, type: EException): boolean {
	const ExceptionClass = ExceptionMap[type];
	if (!ExceptionClass) {
		return false;
	}

	if (!error || typeof error !== "object") {
		return false;
	}

	if (error instanceof ExceptionClass) {
		return true;
	}

	const errObj = error as { name?: string };

	if (errObj.name && errObj.name === ExceptionClass.name) {
		return true;
	}

	return false;
}
