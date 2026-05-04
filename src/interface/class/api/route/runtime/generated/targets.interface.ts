import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";
import type { DeepPartial } from "typeorm";

export interface IApiRouteRuntimeGeneratedTargets<E extends IApiBaseEntity> {
	authenticationRequest?: IApiAuthenticationRequest;
	body?: DeepPartial<E>;
	headers: Record<string, string>;
	ip: string;
	parameters?: Partial<E>;
	query?: TApiControllerGetListQuery<E>;
}
