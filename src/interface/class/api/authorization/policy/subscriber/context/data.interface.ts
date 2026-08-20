import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { EApiRouteType } from "@enum/decorator/api/route";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization/principal";
import type { IApiAuthorizationRequestMetadata } from "@interface/class/api/authorization/request-metadata.interface";
import type { IApiEntity } from "@interface/entity/interface";

/**
 * Data container for authorization policy subscriber context.
 * Provides strongly typed access to request metadata and principal.
 */
export interface IApiAuthorizationPolicySubscriberContextData<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> extends IApiAuthorizationRequestMetadata<E, M> {
	action: string;
	authenticationRequest?: IApiAuthenticationRequest;
	entity: new () => E;
	entityMetadata: IApiEntity<E>;
	permissions: ReadonlyArray<string>;
	principal: IApiAuthorizationPrincipal;
	routeType?: EApiRouteType;
}
