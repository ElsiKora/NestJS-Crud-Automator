import type { EApiAuthorizationMode } from "@enum/class/authorization";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationResourceDefinition } from "@interface/class/api/authorization";

export interface IApiControllerAuthorizationProperties<E extends IApiBaseEntity> {
	defaultMode: EApiAuthorizationMode;
	policyNamespace?: string;
	resourceDefinition?: IApiAuthorizationResourceDefinition<E>;
}
