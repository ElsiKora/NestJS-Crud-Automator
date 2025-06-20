import type { EApiFunctionType } from "@enum/decorator/api/function";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberExecutionContext } from "@interface/class/api/subscriber/execution-context.interface";

export interface IApiSubscriberFunctionExecutionContext<E extends IApiBaseEntity, Result = unknown, Input = unknown> extends IApiSubscriberExecutionContext<E, Result, Input> {
	readonly FUNCTION_TYPE: EApiFunctionType;
}
