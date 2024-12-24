import type { DeepPartial } from "typeorm";

import type { EApiRouteType } from "../../../../enum";
import type { IApiAuthenticationRequest, IApiGetListResponseResult } from "../../../../interface";
import type { TApiControllerGetListQuery } from "../../../decorator";

export type TApiControllerMethodMap<E> = {
	[EApiRouteType.CREATE]: (body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<E>;
	[EApiRouteType.DELETE]: (parameters: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<void>;
	[EApiRouteType.GET_LIST]: (query: TApiControllerGetListQuery<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<IApiGetListResponseResult<E>>;
	[EApiRouteType.GET]: (parameters: Partial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<E>;
	[EApiRouteType.PARTIAL_UPDATE]: (parameters: Partial<E>, body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<E>;
	[EApiRouteType.UPDATE]: (parameters: Partial<E>, body: DeepPartial<E>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<E>;
};
