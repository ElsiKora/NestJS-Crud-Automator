export interface IApiAuthorizationSubject {
	attributes?: Record<string, unknown>;
	id: string;
	permissions: Array<string>;
	roles: Array<string>;
}
