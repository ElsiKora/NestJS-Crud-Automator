import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberRouteExecutionContextData } from "@interface/class/api/subscriber/route-execution-context-data.interface";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route-execution-context.interface";

export type TApiSubscriberRouteBeforeGetContext<E extends IApiBaseEntity> = IApiSubscriberRouteExecutionContext<E, E, IApiSubscriberRouteExecutionContextData<E>>;
