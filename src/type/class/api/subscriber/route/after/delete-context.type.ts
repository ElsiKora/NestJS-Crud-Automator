import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberRouteExecutionContextDataExtended } from "@interface/class/api/subscriber/route-execution-context-data.interface";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route-execution-context.interface";

export type TApiSubscriberRouteAfterDeleteContext<E extends IApiBaseEntity> = IApiSubscriberRouteExecutionContext<E, E, IApiSubscriberRouteExecutionContextDataExtended<E>>;
