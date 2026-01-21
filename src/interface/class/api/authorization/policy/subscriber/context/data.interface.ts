import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationSubject } from "@interface/class/api/authorization/subject.interface";
import type { IApiEntity } from "@interface/entity/interface";

/**
 * Data container for authorization policy subscriber context.
 * Provides strongly typed access to request metadata and subject.
 */
export interface IApiAuthorizationPolicySubscriberContextData<E extends IApiBaseEntity> {
	action: string;
	authenticationRequest?: IApiAuthenticationRequest;
	entity: new () => E;
	entityMetadata: IApiEntity<E>;
	routeType?: EApiRouteType;
	subject: IApiAuthorizationSubject;
}
