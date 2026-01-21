import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationSubject } from "@interface/class/api/authorization/subject.interface";
import type { IApiEntity } from "@interface/entity/interface";

import type { IApiAuthorizationPolicySubscriberContextData } from "./data.interface";

/**
 * Execution context for authorization policy hooks.
 * Includes typed DATA while keeping legacy top-level fields.
 */
export interface IApiAuthorizationPolicySubscriberContext<E extends IApiBaseEntity> {
	action: string;
	authenticationRequest?: IApiAuthenticationRequest;
	readonly DATA: IApiAuthorizationPolicySubscriberContextData<E>;
	entity: new () => E;
	entityMetadata: IApiEntity<E>;
	routeType?: EApiRouteType;
	subject: IApiAuthorizationSubject;
}
