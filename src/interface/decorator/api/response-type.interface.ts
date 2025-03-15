export interface IApiResponseType {
	hasBadRequest?: boolean;
	hasConflict?: boolean;
	hasForbidden?: boolean;
	hasInternalServerError?: boolean;
	hasNotFound?: boolean;
	hasTooManyRequests?: boolean;
	hasUnauthorized?: boolean;
}
