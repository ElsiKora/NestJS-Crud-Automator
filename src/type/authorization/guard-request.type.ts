import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision } from "@interface/authorization";

export type TApiAuthorizationGuardRequest = {
	authorizationDecision?: IApiAuthorizationDecision<IApiBaseEntity>;
	user?: unknown;
} & Record<string, unknown>;
