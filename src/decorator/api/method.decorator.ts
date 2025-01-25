import type { IApiBaseEntity, IApiMethodProperties } from "../../interface";

import { applyDecorators, Delete, Get, HttpCode, HttpStatus, Patch, Post, Put, RequestMethod, UseGuards } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiSecurity, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { EApiAction } from "../../enum";
import { DtoGenerateException } from "../../utility/dto/generate-exception.utility";

export function ApiMethod<T extends IApiBaseEntity>(options: IApiMethodProperties<T>): <TFunction extends Function, Y>(target: object | TFunction, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	let summary: string = "";

	if (options.action) {
		switch (options.action) {
			case EApiAction.AUTHENTICATION: {
				summary = `Authentication of \`${options.entity.name}\``;
				break;
			}

			case EApiAction.CONFIRMATION: {
				summary = `Confirmation of \`${options.entity.name}\``;
				break;
			}

			case EApiAction.CREATE: {
				summary = `Creating \`${options.entity.name}\``;
				break;
			}

			case EApiAction.DELETE: {
				summary = `Deleting \`${options.entity.name}\``;
				break;
			}

			case EApiAction.FETCH: {
				summary = `Fetching \`${options.entity.name}\``;
				break;
			}

			case EApiAction.FETCH_LIST: {
				summary = `Fetching list of \`${options.entity.name}s\``;
				break;
			}

			case EApiAction.FETCH_SIMPLE_LIST: {
				summary = `Fetching simple list of \`${options.entity.name}s\``;
				break;
			}

			case EApiAction.FETCH_SPECIFIED: {
				summary = `Fetching \`${options.entity.name}\` of specified item`;
				break;
			}

			case EApiAction.PARTIAL_UPDATE: {
				summary = `Partial updating \`${options.entity.name}\``;
				break;
			}

			case EApiAction.REFRESH: {
				summary = `Refresh of \`${options.entity.name}\``;
				break;
			}

			case EApiAction.REGISTRATION: {
				summary = `Registration of \`${options.entity.name}\``;
				break;
			}

			case EApiAction.UPDATE: {
				summary = `Updating \`${options.entity.name}\``;
				break;
			}

			case EApiAction.SEARCH: {
				summary = `Searching for \`${options.entity.name}\``;
				break;
			}

			case EApiAction.VALIDATE: {
				summary = `Validating \`${options.entity.name}\``;
				break;
			}

			case EApiAction.ARCHIVE: {
				summary = `Archiving \`${options.entity.name}\``;
				break;
			}

			case EApiAction.RESTORE: {
				summary = `Restoring \`${options.entity.name}\``;
				break;
			}

			case EApiAction.DUPLICATE: {
				summary = `Duplicating \`${options.entity.name}\``;
				break;
			}

			case EApiAction.EXPORT: {
				summary = `Exporting \`${options.entity.name}\``;
				break;
			}

			case EApiAction.IMPORT: {
				summary = `Importing \`${options.entity.name}\``;
				break;
			}

			case EApiAction.BULK_CREATE: {
				summary = `Bulk creating \`${options.entity.name}s\``;
				break;
			}

			case EApiAction.BULK_UPDATE: {
				summary = `Bulk updating \`${options.entity.name}s\``;
				break;
			}

			case EApiAction.BULK_DELETE: {
				summary = `Bulk deleting \`${options.entity.name}s\``;
				break;
			}

			case EApiAction.UPLOAD: {
				summary = `Uploading \`${options.entity.name}\``;
				break;
			}

			case EApiAction.DOWNLOAD: {
				summary = `Downloading \`${options.entity.name}\``;
				break;
			}

			case EApiAction.VERIFY: {
				summary = `Verifying \`${options.entity.name}\``;
				break;
			}

			case EApiAction.SUBSCRIBE: {
				summary = `Subscribing to \`${options.entity.name}\``;
				break;
			}

			case EApiAction.UNSUBSCRIBE: {
				summary = `Unsubscribing from \`${options.entity.name}\``;
				break;
			}

			case EApiAction.LOGOUT: {
				summary = `Logout of \`${options.entity.name}\``;
				break;
			}
		}
	}

	if (!options.description && options.action) {
		switch (options.action) {
			case EApiAction.AUTHENTICATION: {
				options.description = `This method is used for authentication of \`${options.entity.name}\``;

				break;
			}

			case EApiAction.CONFIRMATION: {
				options.description = `This method is used for confirmation of \`${options.entity.name}\``;

				break;
			}

			case EApiAction.CREATE: {
				options.description = `This method is used for creating \`${options.entity.name}\``;

				break;
			}

			case EApiAction.DELETE: {
				options.description = `This method is used for deleting \`${options.entity.name}\``;

				break;
			}

			case EApiAction.FETCH: {
				options.description = `This method is used for fetching \`${options.entity.name}\``;

				break;
			}

			case EApiAction.FETCH_LIST: {
				options.description = `This method is used for fetching list of \`${options.entity.name}s\``;

				break;
			}

			case EApiAction.FETCH_SIMPLE_LIST: {
				options.description = `This method is used for fetching simple list of \`${options.entity.name}s\``;

				break;
			}

			case EApiAction.FETCH_SPECIFIED: {
				options.description = `This method is used for fetching \`${options.entity.name}\` of specified item`;

				break;
			}

			case EApiAction.PARTIAL_UPDATE: {
				options.description = `This method is used for partial updating \`${options.entity.name}\``;

				break;
			}

			case EApiAction.REFRESH: {
				options.description = `This method is used for refresh of \`${options.entity.name}\``;

				break;
			}

			case EApiAction.REGISTRATION: {
				options.description = `This method is used for registration of \`${options.entity.name}\``;

				break;
			}

			case EApiAction.UPDATE: {
				options.description = `This method is used for updating \`${options.entity.name}\``;

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
					type: DtoGenerateException(HttpStatus.UNAUTHORIZED),
				}),
			);
		}

		if (options.responses.forbidden) {
			decorators.push(
				ApiForbiddenResponse({
					description: "Forbiddeb",
					type: DtoGenerateException(HttpStatus.FORBIDDEN),
				}),
			);
		}

		if (options.responses.internalServerError) {
			decorators.push(
				ApiInternalServerErrorResponse({
					description: "Internal Server Error",
					type: DtoGenerateException(HttpStatus.INTERNAL_SERVER_ERROR),
				}),
			);
		}

		if (options.responses.notFound) {
			decorators.push(
				ApiNotFoundResponse({
					description: "Not Found",
					type: DtoGenerateException(HttpStatus.NOT_FOUND),
				}),
			);
		}

		if (options.responses.badRequest) {
			decorators.push(
				ApiBadRequestResponse({
					description: "Bad Request",
					type: DtoGenerateException(HttpStatus.BAD_REQUEST),
				}),
			);
		}

		if (options.responses.tooManyRequests) {
			decorators.push(
				ApiTooManyRequestsResponse({
					description: "Too Many Requests",
					type: DtoGenerateException(HttpStatus.TOO_MANY_REQUESTS),
				}),
			);
		}
	}

	switch (options.method) {
		case RequestMethod.DELETE: {
			decorators.push(Delete(options.path));

			break;
		}

		case RequestMethod.GET: {
			decorators.push(Get(options.path));

			break;
		}

		case RequestMethod.PATCH: {
			decorators.push(Patch(options.path));

			break;
		}

		case RequestMethod.POST: {
			decorators.push(Post(options.path));

			break;
		}

		case RequestMethod.PUT: {
			decorators.push(Put(options.path));

			break;
		}

		default: {
			throw new Error(`ApiMethod error: Method ${options.method} is not supported`);
		}
	}

	if (options.authentication) {
		if (options.authentication?.bearerStrategies?.length) {
			for (const strategy of options.authentication?.bearerStrategies) {
				console.log("Applying bearer strategy", strategy);
				decorators.push(ApiBearerAuth(strategy));
			}
		}

		if (options.authentication?.securityStrategies?.length) {
			for (const strategy of options.authentication.securityStrategies) {
				console.log("Applying security strategy", strategy);
				decorators.push(ApiSecurity(strategy));
			}
		}

		decorators.push(UseGuards(options.authentication.guard));
	}

	return applyDecorators(...decorators);
}
