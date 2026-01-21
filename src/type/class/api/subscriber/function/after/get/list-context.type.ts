import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function/execution/context-data.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context.interface";
import type { IApiGetListResponseResult } from "@interface/decorator/api";

export type TApiSubscriberFunctionAfterGetListContext<E extends IApiBaseEntity> = IApiSubscriberFunctionExecutionContext<E, IApiGetListResponseResult<E>, IApiSubscriberFunctionExecutionContextData<E>>;
