import type { EAuthorizationEffect } from "@enum/authorization/effect.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationRule } from "@interface/authorization/rule/interface";
import type { IApiAuthorizationScope } from "@interface/authorization/scope.interface";
import type { IApiAuthorizationSubject } from "@interface/authorization/subject.interface";
import type { TApiAuthorizationRuleResultTransform } from "@type/authorization/rule/result-transform.type";

export interface IApiAuthorizationDecision<E extends IApiBaseEntity> {
	action: string;
	appliedRules: Array<IApiAuthorizationRule<E>>;
	effect: EAuthorizationEffect;
	policyId: string;
	resource?: E;
	resourceType: string;
	scope?: IApiAuthorizationScope<E>;
	subject: IApiAuthorizationSubject;
	transforms: Array<TApiAuthorizationRuleResultTransform<E>>;
}
