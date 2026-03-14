import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationRequestMetadata } from "@interface/class/api/authorization/request-metadata.interface";
import type { IApiAuthorizationSubjectResolver } from "@interface/class/api/authorization/resolver.interface";
import type { IApiAuthorizationSubject } from "@interface/class/api/authorization/subject.interface";

/**
 * Optional inputs for policy building.
 * Used to enrich policy hook context.
 */
export interface IApiAuthorizationPolicyBuildOptions<E extends IApiBaseEntity = IApiBaseEntity> {
	authenticationRequest?: IApiAuthenticationRequest;
	requestMetadata?: IApiAuthorizationRequestMetadata<E>;
	subject?: IApiAuthorizationSubject;
	subjectResolver?: IApiAuthorizationSubjectResolver;
}
