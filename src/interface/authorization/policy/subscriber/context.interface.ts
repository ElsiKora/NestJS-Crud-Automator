import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity } from "@interface/entity/interface";

export interface IApiAuthorizationPolicySubscriberContext<E extends IApiBaseEntity> {
	action: string;
	entity: new () => E;
	entityMetadata: IApiEntity<E>;
	routeType?: EApiRouteType;
}
