import type { EAuthorizationEffect } from "@enum/class/authorization/effect.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationRule } from "@interface/class/api/authorization/rule/interface";
import type { IApiAuthorizationScope } from "@interface/class/api/authorization/scope.interface";
import type { IApiAuthorizationSubject } from "@interface/class/api/authorization/subject.interface";
import type { TApiAuthorizationRuleResultTransform } from "@type/class/api/authorization/rule/result-transform.type";

export interface IApiAuthorizationDecision<E extends IApiBaseEntity, R> {
	action: string;
	appliedRules: Array<IApiAuthorizationRule<E, R>>;
	effect: EAuthorizationEffect;
	policyId: string;
	resource?: E;
	resourceType: string;
	scope?: IApiAuthorizationScope<E>;
	subject: IApiAuthorizationSubject;
	transforms: Array<TApiAuthorizationRuleResultTransform<E, R>>;
}
