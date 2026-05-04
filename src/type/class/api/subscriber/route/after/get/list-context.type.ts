import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberRouteExecutionContextDataExtended } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiGetListResponseResult } from "@interface/decorator/api/get-list-response-result.interface";

export type TApiSubscriberRouteAfterGetListContext<E extends IApiBaseEntity> = IApiSubscriberRouteExecutionContext<E, IApiGetListResponseResult<E>, IApiSubscriberRouteExecutionContextDataExtended<E, IApiGetListResponseResult<E>>>;
