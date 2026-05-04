import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiRouteMetadata, IApiRouteRuntimeProperties } from "@interface/decorator/api";

export interface IApiRouteRuntimeContextData<E extends IApiBaseEntity> {
	authenticationRequest?: IApiAuthenticationRequest;
	headers: Record<string, string>;
	ip: string;
	metadata: IApiRouteMetadata<E>;
	runtimeProperties: IApiRouteRuntimeProperties<E>;
}
