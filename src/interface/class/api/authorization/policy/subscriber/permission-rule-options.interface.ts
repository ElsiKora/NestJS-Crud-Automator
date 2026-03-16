import type { EApiAuthorizationPermissionMatch } from "@enum/class/authorization";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import type { IApiAuthorizationPolicySubscriberRule } from "./rule.interface";

export interface IApiAuthorizationPolicySubscriberPermissionRuleOptions<E extends IApiBaseEntity, R> extends Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect"> {
	match?: EApiAuthorizationPermissionMatch;
}
