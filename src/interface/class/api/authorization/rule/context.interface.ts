import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization/principal";

export interface IApiAuthorizationRuleContext<E extends IApiBaseEntity> {
	permissions: ReadonlyArray<string>;
	principal: IApiAuthorizationPrincipal;
	resource?: E;
}
