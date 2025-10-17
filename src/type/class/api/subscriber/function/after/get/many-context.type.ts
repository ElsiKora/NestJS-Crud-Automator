import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function-execution-context-data.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function-execution-context.interface";

export type TApiSubscriberFunctionAfterGetManyContext<E extends IApiBaseEntity> = IApiSubscriberFunctionExecutionContext<E, Array<E>, IApiSubscriberFunctionExecutionContextData<E>>;
