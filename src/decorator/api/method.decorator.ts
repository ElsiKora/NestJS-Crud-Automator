import type { IApiBaseEntity, IApiMethodProperties } from "../../interface";

import pluralizer from "@elsikora/pluralizer";
import { applyDecorators, Delete, Get, HttpCode, HttpStatus, Patch, Post, Put, RequestMethod, UseGuards } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiSecurity, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { EApiAction } from "../../enum";
import { DtoGenerateException } from "../../utility/dto/generate-exception.utility";

// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters,@elsikora/typescript/no-unsafe-function-type
export function ApiMethod<T extends IApiBaseEntity>(options: IApiMethodProperties<T>): <TFunction extends Function, Y>(target: object | TFunction, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	let summary: string = "";

	if (options.action) {
		switch (options.action) {
			case EApiAction.ARCHIVE: {
				summary = `Archiving \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.AUTHENTICATION: {
				summary = `Authentication of \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.BULK_CREATE: {
				summary = `Bulk creating \`${String(options.entity.name)}s\``;

				break;
			}

			case EApiAction.BULK_DELETE: {
				summary = `Bulk deleting \`${String(options.entity.name)}s\``;

				break;
			}

			case EApiAction.BULK_UPDATE: {
				summary = `Bulk updating \`${String(options.entity.name)}s\``;

				break;
			}

			case EApiAction.CONFIRMATION: {
				summary = `Confirmation of \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.CREATE: {
				summary = `Creating \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.DELETE: {
				summary = `Deleting \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.DOWNLOAD: {
				summary = `Downloading \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.DUPLICATE: {
				summary = `Duplicating \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.EXPORT: {
				summary = `Exporting \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.FETCH: {
				summary = `Fetching \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.FETCH_LIST: {
				summary = `Fetching list of \`${String(options.entity.name)}s\``;

				break;
			}

			case EApiAction.FETCH_SIMPLE_LIST: {
				summary = `Fetching simple list of \`${String(options.entity.name)}s\``;

				break;
			}

			case EApiAction.FETCH_SPECIFIED: {
				summary = `Fetching \`${pluralizer.toPlural(String(options.entity.name))}\` of specified item`;

				break;
			}

			case EApiAction.IMPORT: {
				summary = `Importing \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.LOGOUT: {
				summary = `Logout of \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.PARTIAL_UPDATE: {
				summary = `Partial updating \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.REFRESH: {
				summary = `Refresh of \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.REGISTRATION: {
				summary = `Registration of \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.RESTORE: {
				summary = `Restoring \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.SEARCH: {
				summary = `Searching for \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.SUBSCRIBE: {
				summary = `Subscribing to \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.UNSUBSCRIBE: {
				summary = `Unsubscribing from \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.UPDATE: {
				summary = `Updating \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.UPLOAD: {
				summary = `Uploading \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.VALIDATE: {
				summary = `Validating \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.VERIFY: {
				summary = `Verifying \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}
		}
	}

	if (!options.description && options.action) {
		switch (options.action) {
			case EApiAction.ARCHIVE: {
				options.description = `This method is used for archiving \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.AUTHENTICATION: {
				options.description = `This method is used for authentication of \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.BULK_CREATE: {
				options.description = `This method is used for bulk creating \`${String(options.entity.name)}s\``;

				break;
			}

			case EApiAction.BULK_DELETE: {
				options.description = `This method is used for bulk deleting \`${String(options.entity.name)}s\``;

				break;
			}

			case EApiAction.BULK_UPDATE: {
				options.description = `This method is used for bulk updating \`${String(options.entity.name)}s\``;

				break;
			}

			case EApiAction.CONFIRMATION: {
				options.description = `This method is used for confirmation of \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.CREATE: {
				options.description = `This method is used for creating \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.DELETE: {
				options.description = `This method is used for deleting \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.DOWNLOAD: {
				options.description = `This method is used for downloading \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.DUPLICATE: {
				options.description = `This method is used for duplicating \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.EXPORT: {
				options.description = `This method is used for exporting \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.FETCH: {
				options.description = `This method is used for fetching \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.FETCH_LIST: {
				options.description = `This method is used for fetching list of \`${String(options.entity.name)}s\``;

				break;
			}

			case EApiAction.FETCH_SIMPLE_LIST: {
				options.description = `This method is used for fetching simple list of \`${String(options.entity.name)}s\``;

				break;
			}

			case EApiAction.FETCH_SPECIFIED: {
				options.description = `This method is used for fetching \`${pluralizer.toPlural(String(options.entity.name))}\` of specified item`;

				break;
			}

			case EApiAction.IMPORT: {
				options.description = `This method is used for importing \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.LOGOUT: {
				options.description = `This method is used for logout of \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.PARTIAL_UPDATE: {
				options.description = `This method is used for partial updating \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.REFRESH: {
				options.description = `This method is used for refresh of \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.REGISTRATION: {
				options.description = `This method is used for registration of \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.RESTORE: {
				options.description = `This method is used for restoring \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.SEARCH: {
				options.description = `This method is used for searching \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.SUBSCRIBE: {
				options.description = `This method is used for subscribing to \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.UNSUBSCRIBE: {
				options.description = `This method is used for unsubscribing from \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.UPDATE: {
				options.description = `This method is used for updating \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.UPLOAD: {
				options.description = `This method is used for uploading \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.VALIDATE: {
				options.description = `This method is used for validating \`${pluralizer.toPlural(String(options.entity.name))}\``;

				break;
			}

			case EApiAction.VERIFY: {
				options.description = `This method is used for verifying \`${pluralizer.toPlural(String(options.entity.name))}\``;

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
		if (options.responses.hasUnauthorized) {
			decorators.push(
				ApiUnauthorizedResponse({
					description: "Unauthorized",
					type: DtoGenerateException(HttpStatus.UNAUTHORIZED),
				}),
			);
		}

		if (options.responses.hasForbidden) {
			decorators.push(
				ApiForbiddenResponse({
					description: "Forbiddeb",
					type: DtoGenerateException(HttpStatus.FORBIDDEN),
				}),
			);
		}

		if (options.responses.hasInternalServerError) {
			decorators.push(
				ApiInternalServerErrorResponse({
					description: "Internal Server Error",
					type: DtoGenerateException(HttpStatus.INTERNAL_SERVER_ERROR),
				}),
			);
		}

		if (options.responses.hasNotFound) {
			decorators.push(
				ApiNotFoundResponse({
					description: "Not Found",
					type: DtoGenerateException(HttpStatus.NOT_FOUND),
				}),
			);
		}

		if (options.responses.hasBadRequest) {
			decorators.push(
				ApiBadRequestResponse({
					description: "Bad Request",
					type: DtoGenerateException(HttpStatus.BAD_REQUEST),
				}),
			);
		}

		if (options.responses.hasTooManyRequests) {
			decorators.push(
				ApiTooManyRequestsResponse({
					description: "Too Many Requests",
					type: DtoGenerateException(HttpStatus.TOO_MANY_REQUESTS),
				}),
			);
		}
	}

	// eslint-disable-next-line @elsikora/typescript/switch-exhaustiveness-check
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
			throw new Error(`ApiMethod error: Method ${String(options.method)} is not supported`);
		}
	}

	if (options.authentication) {
		if (options.authentication?.bearerStrategies?.length) {
			for (const strategy of options.authentication?.bearerStrategies ?? []) {
				decorators.push(ApiBearerAuth(strategy));
			}
		}

		if (options.authentication?.securityStrategies?.length) {
			for (const strategy of options.authentication.securityStrategies) {
				decorators.push(ApiSecurity(strategy));
			}
		}

		decorators.push(UseGuards(options.authentication.guard));
	}

	return applyDecorators(...decorators);
}
