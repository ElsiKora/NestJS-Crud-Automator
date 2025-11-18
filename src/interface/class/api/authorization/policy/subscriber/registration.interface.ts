import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import type { IApiAuthorizationPolicySubscriber } from "./interface";

export interface IApiAuthorizationPolicySubscriberRegistration<E extends IApiBaseEntity> {
	description?: string;
	entity: new () => E;
	policyId: string;
	priority: number;
	subscriber: IApiAuthorizationPolicySubscriber<E>;
}
