import type { EApiControllerGetListQueryPaginationMode, EApiRouteType } from "@enum/decorator/api";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { TApiControllerGetListQuery, TApiControllerGetListResponse } from "@type/decorator/api/controller";
import type { DeepPartial } from "typeorm";

export type TApiControllerMethodMap<E, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> = {
	[EApiRouteType.CREATE]: (body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<E>;
	[EApiRouteType.DELETE]: (parameters: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<void>;
	[EApiRouteType.GET_LIST]: (query: TApiControllerGetListQuery<E, M>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<TApiControllerGetListResponse<E, M>>;
	[EApiRouteType.GET]: (parameters: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<E>;
	[EApiRouteType.PARTIAL_UPDATE]: (parameters: Partial<E>, body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<E>;
	[EApiRouteType.UPDATE]: (parameters: Partial<E>, body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<E>;
};
