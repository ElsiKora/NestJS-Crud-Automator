import type { EApiAuthorizationMode, EApiPolicyEffect } from "@enum/class/authorization";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecisionTrace } from "@interface/class/api/authorization/decision/trace.interface";
import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization/principal/interface";
import type { IApiAuthorizationRule } from "@interface/class/api/authorization/rule/interface";
import type { IApiAuthorizationScope } from "@interface/class/api/authorization/scope.interface";
import type { TApiAuthorizationRuleResultTransform } from "@type/class/api/authorization/rule/result-transform.type";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

export interface IApiAuthorizationDecision<E extends IApiBaseEntity, R = TApiAuthorizationRuleTransformPayload<E>> {
	action: string;
	appliedRules: Array<IApiAuthorizationRule<E, R>>;
	effect: EApiPolicyEffect;
	mode: EApiAuthorizationMode;
	permissions: ReadonlyArray<string>;
	policyId: string;
	policyIds: Array<string>;
	principal: IApiAuthorizationPrincipal;
	resource?: E;
	resourceType: string;
	scope?: IApiAuthorizationScope<E>;
	trace: IApiAuthorizationDecisionTrace;
	transforms: Array<TApiAuthorizationRuleResultTransform<E, R>>;
}
