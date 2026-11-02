import type { EApiControllerGetListQueryPaginationMode, EApiRouteType } from "@enum/decorator/api";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { TApiControllerGetListQuery, TApiControllerGetListResponse } from "@type/decorator/api/controller";
import type { DeepPartial } from "typeorm";

/**
 * The arguments of the generated controller methods.
 * On a controller with `pathScope`, the generated `getList` takes `(parameters, query, headers, ip)` and `create` takes `(parameters, body, headers, ip)` instead, which a type cannot see, so a direct call with these arguments answers `400` with `<parameter> should not be null or undefined`.
 * @template E - Entity type.
 * @template M - List pagination mode.
 */
export type TApiControllerMethodMap<E, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> = {
	[EApiRouteType.CREATE]: (body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<E>;
	[EApiRouteType.DELETE]: (parameters: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<void>;
	[EApiRouteType.GET_LIST]: (query: TApiControllerGetListQuery<E, M>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<TApiControllerGetListResponse<E, M>>;
	[EApiRouteType.GET]: (parameters: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<E>;
	[EApiRouteType.PARTIAL_UPDATE]: (parameters: Partial<E>, body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<E>;
	[EApiRouteType.UPDATE]: (parameters: Partial<E>, body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<E>;
};
