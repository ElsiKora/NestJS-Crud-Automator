import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { EApiRouteType } from "@enum/decorator/api/route";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationPolicySubscriberContextData } from "@interface/class/api/authorization/policy/subscriber/context/data.interface";
import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization/principal";
import type { IApiAuthorizationRequestMetadata } from "@interface/class/api/authorization/request-metadata.interface";
import type { IApiEntity } from "@interface/entity/interface";

/**
 * Execution context for authorization policy hooks.
 * Includes typed DATA and explicit route/action identity.
 */
export interface IApiAuthorizationPolicySubscriberContext<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> extends IApiAuthorizationRequestMetadata<E, M> {
	action: string;
	authenticationRequest?: IApiAuthenticationRequest;
	readonly DATA: IApiAuthorizationPolicySubscriberContextData<E, M>;
	entity: new () => E;
	entityMetadata: IApiEntity<E>;
	permissions: ReadonlyArray<string>;
	principal: IApiAuthorizationPrincipal;
	routeType?: EApiRouteType;
}
