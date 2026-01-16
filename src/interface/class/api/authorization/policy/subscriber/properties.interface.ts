import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicyCacheOptions } from "@interface/class/api/authorization/policy/cache-options.interface";

export interface IApiAuthorizationPolicySubscriberProperties<E extends IApiBaseEntity> {
	cache?: IApiAuthorizationPolicyCacheOptions;
	description?: string;
	entity: new () => E;
	policyId?: string;
	priority?: number;
}
