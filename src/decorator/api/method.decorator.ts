import { applyDecorators, Delete, Get, HttpCode, HttpStatus, Patch, Post, Put, RequestMethod } from "@nestjs/common";
import { ApiBadRequestResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { EApiAction } from "../../enum";
import type { IApiBaseEntity, IApiMethodProperties } from "../../interface";
import { ExceptionBadRequestDTO } from "../../dto/exception/bad-request.dto";

import { ExceptionForbiddenDTO } from "../../dto/exception/forbidden.dto";
import { ExceptionInternalServerErrorDTO } from "../../dto/exception/internal-server-error.dto";
import { ExceptionNotFoundDTO } from "../../dto/exception/not-found.dto";
import { ExceptionTooManyRequestsDTO } from "../../dto/exception/too-many-requests.dto";
import { ExceptionUnauthorizedDTO } from "../../dto/exception/unauthorized.dto";

export function ApiMethod<T extends IApiBaseEntity>(options: IApiMethodProperties<T>): <TFunction extends Function, Y>(target: object | TFunction, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y> | undefined) => void {
	let summary: string = "";

	if (options.action) {
		switch (options.action) {
			case EApiAction.FETCH: {
				summary = `Fetching \`${options.entity.name}\``;

				break;
			}

			case EApiAction.CREATE: {
				summary = `Creating \`${options.entity.name}\``;

				break;
			}

			case EApiAction.UPDATE: {
				summary = `Updating \`${options.entity.name}\``;

				break;
			}

			case EApiAction.DELETE: {
				summary = `Deleting \`${options.entity.name}\``;

				break;
			}

			case EApiAction.PARTIAL_UPDATE: {
				summary = `Partial updating \`${options.entity.name}\``;

				break;
			}

			case EApiAction.FETCH_LIST: {
				summary = `Fetching list of \`${options.entity.name}s\``;

				break;
			}

			case EApiAction.FETCH_SPECIFIED: {
				summary = `Fetching \`${options.entity.name}\` of specified item`;

				break;
			}

			case EApiAction.REGISTRATION: {
				summary = `Registration of \`${options.entity.name}\``;

				break;
			}

			case EApiAction.AUTHENTICATION: {
				summary = `Authentication of \`${options.entity.name}\``;

				break;
			}

			case EApiAction.CONFIRMATION: {
				summary = `Confirmation of \`${options.entity.name}\``;

				break;
			}

			case EApiAction.REFRESH: {
				summary = `Refresh of \`${options.entity.name}\``;

				break;
			}

			case EApiAction.FETCH_SIMPLE_LIST: {
				summary = `Fetching simple list of \`${options.entity.name}s\``;

				break;
			}
		}
	}

	if (!options.description && options.action) {
		switch (options.action) {
			case EApiAction.FETCH: {
				options.description = `This method is used for fetching \`${options.entity.name}\``;

				break;
			}

			case EApiAction.CREATE: {
				options.description = `This method is used for creating \`${options.entity.name}\``;

				break;
			}

			case EApiAction.UPDATE: {
				options.description = `This method is used for updating \`${options.entity.name}\``;

				break;
			}

			case EApiAction.DELETE: {
				options.description = `This method is used for deleting \`${options.entity.name}\``;

				break;
			}

			case EApiAction.PARTIAL_UPDATE: {
				options.description = `This method is used for partial updating \`${options.entity.name}\``;

				break;
			}

			case EApiAction.FETCH_LIST: {
				options.description = `This method is used for fetching list of \`${options.entity.name}s\``;

				break;
			}

			case EApiAction.FETCH_SPECIFIED: {
				options.description = `This method is used for fetching \`${options.entity.name}\` of specified item`;

				break;
			}

			case EApiAction.REGISTRATION: {
				options.description = `This method is used for registration of \`${options.entity.name}\``;

				break;
			}

			case EApiAction.AUTHENTICATION: {
				options.description = `This method is used for authentication of \`${options.entity.name}\``;

				break;
			}

			case EApiAction.CONFIRMATION: {
				options.description = `This method is used for confirmation of \`${options.entity.name}\``;

				break;
			}

			case EApiAction.REFRESH: {
				options.description = `This method is used for refresh of \`${options.entity.name}\``;

				break;
			}

			case EApiAction.FETCH_SIMPLE_LIST: {
				options.description = `This method is used for fetching simple list of \`${options.entity.name}s\``;

				break;
			}
		}
	}

	const decorators: Array<MethodDecorator> = [
		ApiOperation({ description: options.description, summary }),
		ApiResponse({
			description: "Success",
			status: options.httpCode,
			type: options.responseType,
		}),
		HttpCode(options.httpCode),
	];

	if (options.throttler) {
		decorators.push(Throttle({ default: options.throttler }));
	}

	if (options.responses) {
		if (options.responses.unauthorized) {
			decorators.push(
				ApiUnauthorizedResponse({
					description: "Unauthorized",
					status: HttpStatus.UNAUTHORIZED,
					type: ExceptionUnauthorizedDTO,
				}),
			);
		}

		if (options.responses.forbidden) {
			decorators.push(
				ApiForbiddenResponse({
					description: "Forbidden",
					status: HttpStatus.FORBIDDEN,
					type: ExceptionForbiddenDTO,
				}),
			);
		}

		if (options.responses.internalServerError) {
			decorators.push(
				ApiInternalServerErrorResponse({
					description: "Internal Server Error",
					status: HttpStatus.INTERNAL_SERVER_ERROR,
					type: ExceptionInternalServerErrorDTO,
				}),
			);
		}

		if (options.responses.notFound) {
			decorators.push(
				ApiNotFoundResponse({
					description: "Not Found",
					status: HttpStatus.NOT_FOUND,
					type: ExceptionNotFoundDTO,
				}),
			);
		}

		if (options.responses.badRequest) {
			decorators.push(
				ApiBadRequestResponse({
					description: "Bad Request",
					status: HttpStatus.BAD_REQUEST,
					type: ExceptionBadRequestDTO,
				}),
			);
		}

		if (options.responses.tooManyRequests) {
			decorators.push(
				ApiBadRequestResponse({
					description: "Too Many Requests",
					status: HttpStatus.TOO_MANY_REQUESTS,
					type: ExceptionTooManyRequestsDTO,
				}),
			);
		}
	}

	switch (options.method) {
		case RequestMethod.GET: {
			decorators.push(Get(options.path));

			break;
		}

		case RequestMethod.POST: {
			decorators.push(Post(options.path));

			break;
		}

		case RequestMethod.PATCH: {
			decorators.push(Patch(options.path));

			break;
		}

		case RequestMethod.PUT: {
			decorators.push(Put(options.path));

			break;
		}

		case RequestMethod.DELETE: {
			decorators.push(Delete(options.path));

			break;
		}

		default: {
			throw new Error(`ApiMethod error: Method ${options.method} is not supported`);
		}
	}

	/* if (options.authentication) {
        switch (options.authentication) {
            case EApiAuthenticationType.USER: {
                decorators.push(ApiBearerAuth("userAuthorization"), isUser());

                break;
            }

            case EApiAuthenticationType.ADMIN: {
                decorators.push(ApiBearerAuth("adminAuthorization"), isAdminUser());

                break;
            }

            case EApiAuthenticationType.ACCOUNT: {
                decorators.push(ApiBearerAuth("accountAuthorization"), ApiSecurity("accountRequestSignature"), ApiSecurity("accountRequestTimestamp"), isAccount());

                break;
            }
        }
    }*/

	return applyDecorators(...decorators);
}
