import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationRule } from "@interface/authorization/rule/interface";

export interface IApiAuthorizationPolicy<E extends IApiBaseEntity, R> {
	action: string;
	description?: string;
	entity: new () => E;
	policyId: string;
	rules: Array<IApiAuthorizationRule<E, R>>;
}
