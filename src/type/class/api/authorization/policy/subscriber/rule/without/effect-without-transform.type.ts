import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberRule } from "@interface/class/api/authorization/policy/subscriber";

export type TApiAuthorizationPolicySubscriberRuleWithoutEffectWithoutTransform<E extends IApiBaseEntity> = {
	resultTransform?: never;
} & Omit<IApiAuthorizationPolicySubscriberRule<E, never>, "effect" | "resultTransform">;
