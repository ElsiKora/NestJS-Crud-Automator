import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity } from "@interface/entity/interface";

export interface IApiAuthorizationPolicySubscriberContext<E extends IApiBaseEntity> {
	entity: new () => E;
	entityMetadata: IApiEntity<E>;
}
