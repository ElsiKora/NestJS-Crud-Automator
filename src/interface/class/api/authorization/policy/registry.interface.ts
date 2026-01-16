import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicyBuildOptions } from "@interface/class/api/authorization/policy/build-options.interface";
import type { IApiAuthorizationPolicyCacheOptions } from "@interface/class/api/authorization/policy/cache-options.interface";
import type { IApiAuthorizationPolicy } from "@interface/class/api/authorization/policy/interface";
import type { IApiAuthorizationPolicySubscriberRegistration } from "@interface/class/api/authorization/policy/subscriber/registration.interface";
import type { TApiAuthorizationPolicyHookResult } from "@type/class/api/authorization/policy/hook";

export interface IApiAuthorizationPolicyRegistry {
	buildAggregatedPolicy<E extends IApiBaseEntity, TAction extends string>(entity: new () => E, action: TAction, options?: IApiAuthorizationPolicyBuildOptions): Promise<IApiAuthorizationPolicy<E, TApiAuthorizationPolicyHookResult<TAction, E>> | undefined>;
	clear(): void;
	configureCache(options?: IApiAuthorizationPolicyCacheOptions): void;
	registerSubscriber<E extends IApiBaseEntity>(registration: IApiAuthorizationPolicySubscriberRegistration<E>): void;
}
