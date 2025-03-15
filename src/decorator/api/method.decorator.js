import { applyDecorators, Delete, Get, HttpCode, HttpStatus, Patch, Post, Put, RequestMethod, UseGuards } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOperation, ApiResponse, ApiSecurity, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { EApiAction } from "../../enum";
import { DtoGenerateException } from "../../utility/dto/generate-exception.utility";
export function ApiMethod(options) {
    let summary = "";
    if (options.action) {
        switch (options.action) {
            case EApiAction.ARCHIVE: {
                summary = `Archiving \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.AUTHENTICATION: {
                summary = `Authentication of \`${String(options.entity.name)}\``;
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
                summary = `Confirmation of \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.CREATE: {
                summary = `Creating \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.DELETE: {
                summary = `Deleting \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.DOWNLOAD: {
                summary = `Downloading \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.DUPLICATE: {
                summary = `Duplicating \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.EXPORT: {
                summary = `Exporting \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.FETCH: {
                summary = `Fetching \`${String(options.entity.name)}\``;
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
                summary = `Fetching \`${String(options.entity.name)}\` of specified item`;
                break;
            }
            case EApiAction.IMPORT: {
                summary = `Importing \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.LOGOUT: {
                summary = `Logout of \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.PARTIAL_UPDATE: {
                summary = `Partial updating \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.REFRESH: {
                summary = `Refresh of \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.REGISTRATION: {
                summary = `Registration of \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.RESTORE: {
                summary = `Restoring \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.SEARCH: {
                summary = `Searching for \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.SUBSCRIBE: {
                summary = `Subscribing to \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.UNSUBSCRIBE: {
                summary = `Unsubscribing from \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.UPDATE: {
                summary = `Updating \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.UPLOAD: {
                summary = `Uploading \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.VALIDATE: {
                summary = `Validating \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.VERIFY: {
                summary = `Verifying \`${String(options.entity.name)}\``;
                break;
            }
        }
    }
    if (!options.description && options.action) {
        switch (options.action) {
            case EApiAction.ARCHIVE: {
                options.description = `This method is used for archiving \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.AUTHENTICATION: {
                options.description = `This method is used for authentication of \`${String(options.entity.name)}\``;
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
                options.description = `This method is used for confirmation of \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.CREATE: {
                options.description = `This method is used for creating \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.DELETE: {
                options.description = `This method is used for deleting \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.DOWNLOAD: {
                options.description = `This method is used for downloading \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.DUPLICATE: {
                options.description = `This method is used for duplicating \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.EXPORT: {
                options.description = `This method is used for exporting \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.FETCH: {
                options.description = `This method is used for fetching \`${String(options.entity.name)}\``;
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
                options.description = `This method is used for fetching \`${String(options.entity.name)}\` of specified item`;
                break;
            }
            case EApiAction.IMPORT: {
                options.description = `This method is used for importing \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.LOGOUT: {
                options.description = `This method is used for logout of \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.PARTIAL_UPDATE: {
                options.description = `This method is used for partial updating \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.REFRESH: {
                options.description = `This method is used for refresh of \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.REGISTRATION: {
                options.description = `This method is used for registration of \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.RESTORE: {
                options.description = `This method is used for restoring \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.SEARCH: {
                options.description = `This method is used for searching \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.SUBSCRIBE: {
                options.description = `This method is used for subscribing to \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.UNSUBSCRIBE: {
                options.description = `This method is used for unsubscribing from \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.UPDATE: {
                options.description = `This method is used for updating \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.UPLOAD: {
                options.description = `This method is used for uploading \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.VALIDATE: {
                options.description = `This method is used for validating \`${String(options.entity.name)}\``;
                break;
            }
            case EApiAction.VERIFY: {
                options.description = `This method is used for verifying \`${String(options.entity.name)}\``;
                break;
            }
        }
    }
    const decorators = [
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
            decorators.push(ApiUnauthorizedResponse({
                description: "Unauthorized",
                type: DtoGenerateException(HttpStatus.UNAUTHORIZED),
            }));
        }
        if (options.responses.hasForbidden) {
            decorators.push(ApiForbiddenResponse({
                description: "Forbiddeb",
                type: DtoGenerateException(HttpStatus.FORBIDDEN),
            }));
        }
        if (options.responses.hasInternalServerError) {
            decorators.push(ApiInternalServerErrorResponse({
                description: "Internal Server Error",
                type: DtoGenerateException(HttpStatus.INTERNAL_SERVER_ERROR),
            }));
        }
        if (options.responses.hasNotFound) {
            decorators.push(ApiNotFoundResponse({
                description: "Not Found",
                type: DtoGenerateException(HttpStatus.NOT_FOUND),
            }));
        }
        if (options.responses.hasBadRequest) {
            decorators.push(ApiBadRequestResponse({
                description: "Bad Request",
                type: DtoGenerateException(HttpStatus.BAD_REQUEST),
            }));
        }
        if (options.responses.hasTooManyRequests) {
            decorators.push(ApiTooManyRequestsResponse({
                description: "Too Many Requests",
                type: DtoGenerateException(HttpStatus.TOO_MANY_REQUESTS),
            }));
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
//# sourceMappingURL=method.decorator.js.map