import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberPermissionRuleOptions } from "@interface/class/api/authorization/policy/subscriber";

export type TApiAuthorizationPolicySubscriberPermissionRuleOptionsWithoutTransform<E extends IApiBaseEntity> = {
	resultTransform?: never;
} & Omit<IApiAuthorizationPolicySubscriberPermissionRuleOptions<E, never>, "resultTransform">;
