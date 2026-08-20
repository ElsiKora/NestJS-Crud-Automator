import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberRouteExecutionContextDataExtended } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context";
import type { TApiControllerGetListResponse } from "@type/decorator/api/controller";

export type TApiSubscriberRouteAfterGetListContext<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> = IApiSubscriberRouteExecutionContext<E, TApiControllerGetListResponse<E, M>, IApiSubscriberRouteExecutionContextDataExtended<E, TApiControllerGetListResponse<E, M>, M>>;
