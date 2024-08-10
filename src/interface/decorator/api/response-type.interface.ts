export interface IApiResponseType {
	badRequest?: boolean;
	conflict?: boolean;
	forbidden?: boolean;
	internalServerError?: boolean;
	notFound?: boolean;
	tooManyRequests?: boolean;
	unauthorized?: boolean;
}
