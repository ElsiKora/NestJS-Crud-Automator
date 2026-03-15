import type { EApiPolicyEffect } from "@enum/class/authorization";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationRuleCondition } from "@type/class/api/authorization/rule/condition.type";
import type { TApiAuthorizationRuleResultTransform } from "@type/class/api/authorization/rule/result-transform.type";
import type { TApiAuthorizationRuleScopeResolver } from "@type/class/api/authorization/rule/scope-resolver.type";

export interface IApiAuthorizationPolicySubscriberRule<E extends IApiBaseEntity, R> {
	condition?: TApiAuthorizationRuleCondition<E>;
	description?: string;
	effect: EApiPolicyEffect;
	priority?: number;
	resultTransform?: TApiAuthorizationRuleResultTransform<E, R>;
	scope?: TApiAuthorizationRuleScopeResolver<E>;
}
