import { EApiFunctionType } from "@enum/decorator/api/function";
import { IApiBaseEntity } from "@interface/api-base-entity.interface";
import { IApiSubscriberExecutionContext } from "@interface/class/api/subscriber/execution-context.interface";

export interface IApiSubscriberFunctionExecutionContext<E extends IApiBaseEntity, Result = unknown, Input = unknown> extends IApiSubscriberExecutionContext<E, Result, Input> {
    readonly functionType: EApiFunctionType;
} 