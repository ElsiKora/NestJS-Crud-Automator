import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";

import type { IApiAuthorizationSubject } from "./subject.interface";

export interface IApiAuthorizationSubjectResolver {
	resolve(user: unknown, authenticationRequest?: IApiAuthenticationRequest): IApiAuthorizationSubject | Promise<IApiAuthorizationSubject>;
}
