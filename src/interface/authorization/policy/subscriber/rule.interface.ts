import type { EAuthorizationEffect } from "@enum/authorization/effect.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationRuleCondition } from "@type/authorization/rule/condition.type";
import type { TApiAuthorizationRuleResultTransform } from "@type/authorization/rule/result-transform.type";
import type { TApiAuthorizationRuleScopeResolver } from "@type/authorization/rule/scope-resolver.type";

export interface IApiAuthorizationPolicySubscriberRule<E extends IApiBaseEntity> {
	condition?: TApiAuthorizationRuleCondition<E>;
	description?: string;
	effect: EAuthorizationEffect;
	priority?: number;
	resultTransform?: TApiAuthorizationRuleResultTransform<E>;
	scope?: TApiAuthorizationRuleScopeResolver<E>;
}
