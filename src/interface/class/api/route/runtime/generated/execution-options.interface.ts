import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteRuntimeGeneratedTargets } from "@interface/class/api/route/runtime/generated/targets.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { TApiControllerMethod } from "@type/class";

export interface IApiRouteRuntimeGeneratedExecutionOptions<E extends IApiBaseEntity, R extends EApiRouteType> {
	controller: TApiControllerMethod<E>;
	entityMetadata: IApiEntity<E>;
	method: R;
	methodName: string;
	properties: IApiControllerProperties<E>;
	targets: IApiRouteRuntimeGeneratedTargets<E>;
}
