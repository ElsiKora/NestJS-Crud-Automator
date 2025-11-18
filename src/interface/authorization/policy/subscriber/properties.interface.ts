import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

export interface IApiAuthorizationPolicySubscriberProperties<E extends IApiBaseEntity> {
	description?: string;
	entity: new () => E;
	policyId?: string;
	priority?: number;
}
