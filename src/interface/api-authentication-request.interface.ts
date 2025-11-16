import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision } from "@interface/authorization";

export interface IApiAuthenticationRequest {
	authorizationDecision?: IApiAuthorizationDecision<IApiBaseEntity>;
	user: IApiBaseEntity;
}
