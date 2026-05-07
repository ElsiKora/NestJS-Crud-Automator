import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicyRegistry } from "@interface/class/api/authorization";

import { ApiAuthorizationHookPermissionCache } from "@class/api/authorization/hook";
import { ApiAuthorizationIamAttachmentCache, ApiAuthorizationIamDocumentCache } from "@class/api/authorization/iam";
import { AUTHORIZATION_POLICY_REGISTRY_TOKEN } from "@constant/class/authorization";
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class ApiAuthorizationCacheInvalidationService {
	public constructor(
		@Inject(AUTHORIZATION_POLICY_REGISTRY_TOKEN)
		private readonly policyRegistry: IApiAuthorizationPolicyRegistry,
		private readonly iamAttachmentCache: ApiAuthorizationIamAttachmentCache,
		private readonly iamDocumentCache: ApiAuthorizationIamDocumentCache,
		private readonly hookPermissionCache: ApiAuthorizationHookPermissionCache,
	) {}

	public clearAll(entity?: new () => IApiBaseEntity): void {
		this.clearPolicyCache(entity);
		this.clearIamCache();
		this.clearHookPermissionCache();
	}

	public clearHookPermissionCache(): void {
		this.hookPermissionCache.clear();
	}

	public clearIamAttachmentCache(): void {
		this.iamAttachmentCache.clear();
	}

	public clearIamCache(): void {
		this.clearIamAttachmentCache();
		this.clearIamDocumentCache();
	}

	public clearIamDocumentCache(): void {
		this.iamDocumentCache.clear();
	}

	public clearPolicyCache(entity?: new () => IApiBaseEntity): void {
		this.policyRegistry.invalidateCache(entity);
	}

	public invalidate(entity?: new () => IApiBaseEntity): void {
		this.clearPolicyCache(entity);
	}
}
