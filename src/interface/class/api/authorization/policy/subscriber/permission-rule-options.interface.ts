import type { EAuthorizationPermissionMatch } from "@enum/class/authorization/permission-match.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import type { IApiAuthorizationPolicySubscriberRule } from "./rule.interface";

export interface IApiAuthorizationPolicySubscriberPermissionRuleOptions<E extends IApiBaseEntity, R> extends Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect"> {
	match?: EAuthorizationPermissionMatch;
}
