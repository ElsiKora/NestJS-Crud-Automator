import { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import { IApiBaseEntity } from "@interface/api-base-entity.interface";
import { IApiSubscriberExecutionContext } from "@interface/class/api/subscriber/execution-context.interface";

export interface IApiSubscriberRouteExecutionContext<E extends IApiBaseEntity, Result = unknown, Input = unknown> extends IApiSubscriberExecutionContext<E, Result, Input> {
    readonly routeType: EApiRouteType;
} 