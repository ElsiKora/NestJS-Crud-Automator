import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

export type TApiAuthorizationGuardRequest = {
	authorizationDecision?: IApiAuthorizationDecision<IApiBaseEntity, TApiAuthorizationRuleTransformPayload<IApiBaseEntity>>;
	body?: unknown;
	headers?: Record<string, unknown>;
	ip?: unknown;
	params?: unknown;
	query?: unknown;
	user?: unknown;
} & Record<string, unknown>;
