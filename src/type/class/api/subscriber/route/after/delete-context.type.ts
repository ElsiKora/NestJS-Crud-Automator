import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberRouteExecutionContextDataExtended } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context";

export type TApiSubscriberRouteAfterDeleteContext<E extends IApiBaseEntity> = IApiSubscriberRouteExecutionContext<E, Partial<E>, IApiSubscriberRouteExecutionContextDataExtended<E, undefined>>;
