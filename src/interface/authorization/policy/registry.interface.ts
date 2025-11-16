import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicy } from "@interface/authorization/policy/interface";
import type { IApiAuthorizationPolicySubscriberRegistration } from "@interface/authorization/policy/subscriber/registration.interface";

export interface IApiAuthorizationPolicyRegistry {
	buildAggregatedPolicy<E extends IApiBaseEntity>(entity: new () => E, action: string): Promise<IApiAuthorizationPolicy<E> | undefined>;
	clear(): void;
	registerPolicy<E extends IApiBaseEntity>(policy: IApiAuthorizationPolicy<E>): void;
	registerSubscriber<E extends IApiBaseEntity>(registration: IApiAuthorizationPolicySubscriberRegistration<E>): void;
}
