import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationPrincipal, IApiAuthorizationPrincipalResolver } from "@interface/class/api/authorization/principal";
import type { IApiAuthorizationRequestMetadata } from "@interface/class/api/authorization/request-metadata.interface";

/**
 * Optional inputs for policy building.
 * Used to enrich policy hook context.
 */
export interface IApiAuthorizationPolicyBuildOptions<E extends IApiBaseEntity = IApiBaseEntity> {
	authenticationRequest?: IApiAuthenticationRequest;
	permissions?: ReadonlyArray<string>;
	principal?: IApiAuthorizationPrincipal;
	principalResolver?: IApiAuthorizationPrincipalResolver;
	requestMetadata?: IApiAuthorizationRequestMetadata<E>;
	routeType?: EApiRouteType;
}
