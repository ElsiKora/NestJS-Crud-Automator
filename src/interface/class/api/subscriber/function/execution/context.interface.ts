import type { EApiFunctionType } from "@enum/decorator/api/function-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberExecutionContext } from "@interface/class/api/subscriber/execution-context.interface";

/**
 * Execution context for function subscriber callbacks.
 * Extends base execution context with function type information.
 * @template E - Entity type extending IApiBaseEntity
 * @template Result - Type of the result field (mutable data payload)
 * @template Input - Type of the DATA field (immutable context data). Use IApiSubscriberFunctionExecutionContextData<E> for typed access.
 * @example
 * ```typescript
 * import type { IApiSubscriberFunctionExecutionContextData } from '@elsikora/nestjs-crud-automator';
 *
 * async onBeforeCreate(
 *   context: IApiSubscriberFunctionExecutionContext<
 *     User,
 *     TApiFunctionCreateProperties<User>,
 *     IApiSubscriberFunctionExecutionContextData<User>
 *   >
 * ): Promise<TApiFunctionCreateProperties<User>> {
 *   const manager = context.DATA.eventManager;
 *   const repository = context.DATA.repository;
 *   // ...
 * }
 * ```
 */
export interface IApiSubscriberFunctionExecutionContext<E extends IApiBaseEntity, Result = unknown, Input = unknown> extends IApiSubscriberExecutionContext<E, Result, Input> {
	readonly FUNCTION_TYPE: EApiFunctionType;
}
