import type { EAuthorizationEffect } from "@enum/authorization/effect.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationRuleCondition } from "@type/class/api/authorization/rule/condition.type";
import type { TApiAuthorizationRuleResultTransform } from "@type/class/api/authorization/rule/result-transform.type";
import type { TApiAuthorizationRuleScopeResolver } from "@type/class/api/authorization/rule/scope-resolver.type";

export interface IApiAuthorizationRule<E extends IApiBaseEntity, R> {
	action: string;
	condition?: TApiAuthorizationRuleCondition<E>;
	description?: string;
	effect: EAuthorizationEffect;
	policyId: string;
	priority: number;
	resultTransform?: TApiAuthorizationRuleResultTransform<E, R>;
	scope?: TApiAuthorizationRuleScopeResolver<E>;
}
