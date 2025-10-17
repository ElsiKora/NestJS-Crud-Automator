import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function-execution-context-data.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function-execution-context.interface";
import type { TApiFunctionGetProperties } from "@type/decorator/api/function";

export type TApiSubscriberFunctionBeforeGetContext<E extends IApiBaseEntity> = IApiSubscriberFunctionExecutionContext<E, TApiFunctionGetProperties<E>, IApiSubscriberFunctionExecutionContextData<E>>;
