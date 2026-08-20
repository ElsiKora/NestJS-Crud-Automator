import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { EApiRouteType } from "@enum/decorator/api/route";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationPrincipal, IApiAuthorizationPrincipalResolver } from "@interface/class/api/authorization/principal";
import type { IApiAuthorizationRequestMetadata } from "@interface/class/api/authorization/request-metadata.interface";

/**
 * Optional inputs for policy building.
 * Used to enrich policy hook context.
 */
export interface IApiAuthorizationPolicyBuildOptions<E extends IApiBaseEntity = IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> {
	authenticationRequest?: IApiAuthenticationRequest;
	permissions?: ReadonlyArray<string>;
	principal?: IApiAuthorizationPrincipal;
	principalResolver?: IApiAuthorizationPrincipalResolver;
	requestMetadata?: IApiAuthorizationRequestMetadata<E, M>;
	routeType?: EApiRouteType;
}
