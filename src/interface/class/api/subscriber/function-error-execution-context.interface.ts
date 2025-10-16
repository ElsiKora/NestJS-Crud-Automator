import type { EApiFunctionType } from "@enum/decorator/api/function";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberErrorExecutionContext } from "@interface/class/api/subscriber/error-execution-context.interface";

/**
 * Error execution context for function subscriber callbacks.
 * Contains function type information but no result field.
 */
export interface IApiSubscriberFunctionErrorExecutionContext<E extends IApiBaseEntity, Input = unknown> extends IApiSubscriberErrorExecutionContext<E, Input> {
	readonly FUNCTION_TYPE: EApiFunctionType;
}
