export interface IApiResponseType {
	hasConflict?: boolean;
	hasForbidden?: boolean;
	hasNotFound?: boolean;
	hasTooManyRequests?: boolean;
	hasUnauthorized?: boolean;
}
