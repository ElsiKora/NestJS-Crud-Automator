import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function/execution/context-data.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context.interface";
import type { TApiFunctionGetManyProperties } from "@type/decorator/api/function";

export type TApiSubscriberFunctionBeforeGetManyContext<E extends IApiBaseEntity, Result extends TApiFunctionGetManyProperties<E> = TApiFunctionGetManyProperties<E>> = IApiSubscriberFunctionExecutionContext<E, Result, IApiSubscriberFunctionExecutionContextData<E>>;
