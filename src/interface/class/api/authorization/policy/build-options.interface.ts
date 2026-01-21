import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationSubject } from "@interface/class/api/authorization/subject.interface";

/**
 * Optional inputs for policy building.
 * Used to enrich policy hook context.
 */
export interface IApiAuthorizationPolicyBuildOptions {
	authenticationRequest?: IApiAuthenticationRequest;
	subject?: IApiAuthorizationSubject;
}
