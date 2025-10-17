import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberRouteExecutionContextData } from "@interface/class/api/subscriber/route-execution-context-data.interface";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route-execution-context.interface";
import type { DeepPartial } from "typeorm";

export type TApiSubscriberRouteBeforeCreateContext<E extends IApiBaseEntity> = IApiSubscriberRouteExecutionContext<E, { body: DeepPartial<E> }, IApiSubscriberRouteExecutionContextData<E>>;
