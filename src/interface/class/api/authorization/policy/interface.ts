import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationRule } from "@interface/class/api/authorization/rule/interface";

export interface IApiAuthorizationPolicy<E extends IApiBaseEntity, R> {
	action: string;
	description?: string;
	entity: new () => E;
	policyId: string;
	policyIds: Array<string>;
	rules: Array<IApiAuthorizationRule<E, R>>;
}
