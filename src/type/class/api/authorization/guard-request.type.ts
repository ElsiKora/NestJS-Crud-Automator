import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization";

export type TApiAuthorizationGuardRequest = {
	authorizationDecision?: IApiAuthorizationDecision<IApiBaseEntity, unknown>;
	body?: unknown;
	headers?: Record<string, unknown>;
	ip?: unknown;
	params?: unknown;
	query?: unknown;
	user?: unknown;
} & Record<string, unknown>;
