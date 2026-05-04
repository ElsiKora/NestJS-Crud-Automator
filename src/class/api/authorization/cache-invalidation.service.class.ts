import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicyRegistry } from "@interface/class/api/authorization";

import { AUTHORIZATION_POLICY_REGISTRY_TOKEN } from "@constant/class/authorization";
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class ApiAuthorizationCacheInvalidationService {
	public constructor(
		@Inject(AUTHORIZATION_POLICY_REGISTRY_TOKEN)
		private readonly policyRegistry: IApiAuthorizationPolicyRegistry,
	) {}

	public invalidate(entity?: new () => IApiBaseEntity): void {
		this.policyRegistry.invalidateCache(entity);
	}
}
