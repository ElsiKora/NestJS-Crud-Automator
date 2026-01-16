import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicyCacheOptions } from "@interface/class/api/authorization/policy/cache-options.interface";

import type { IApiAuthorizationPolicySubscriber } from "./interface";

export interface IApiAuthorizationPolicySubscriberRegistration<E extends IApiBaseEntity> {
	cache?: IApiAuthorizationPolicyCacheOptions;
	description?: string;
	entity: new () => E;
	policyId: string;
	priority: number;
	subscriber: IApiAuthorizationPolicySubscriber<E>;
}
