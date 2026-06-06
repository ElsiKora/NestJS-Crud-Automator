import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function/execution/context-data.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context.interface";
import type { TApiFunctionDeleteCriteria } from "@type/decorator/api/function";

export type TApiSubscriberFunctionBeforeDeleteContext<E extends IApiBaseEntity, Result extends TApiFunctionDeleteCriteria<E> = TApiFunctionDeleteCriteria<E>> = IApiSubscriberFunctionExecutionContext<E, Result, IApiSubscriberFunctionExecutionContextData<E>>;
