import type { EApiAuthorizationMode } from "@enum/class/authorization";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicy } from "@interface/class/api/authorization/policy/interface";
import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization/principal";

export interface IApiAuthorizationEngineEvaluateOptions<E extends IApiBaseEntity, R> {
	action: string;
	mode: EApiAuthorizationMode;
	permissions: ReadonlyArray<string>;
	policy: IApiAuthorizationPolicy<E, R>;
	principal: IApiAuthorizationPrincipal;
	resource?: E;
	resourceType: string;
}
