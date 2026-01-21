import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberExecutionContext } from "@interface/class/api/subscriber/execution-context.interface";

/**
 * Execution context for route subscriber callbacks.
 * Extends base execution context with route type information.
 * @template E - Entity type extending IApiBaseEntity
 * @template Result - Type of the result field (mutable data payload)
 * @template Input - Type of the DATA field (immutable context data). Use IApiSubscriberRouteExecutionContextData<E, R> or IApiSubscriberRouteExecutionContextDataExtended<E, R> for typed access.
 * @example
 * ```typescript
 * import type { IApiSubscriberRouteExecutionContextData } from '@elsikora/nestjs-crud-automator';
 *
 * async onBeforeCreate(
 *   context: IApiSubscriberRouteExecutionContext<
 *     User,
 *     { body: DeepPartial<User> },
 *     IApiSubscriberRouteExecutionContextData<User, User>
 *   >
 * ): Promise<{ body: DeepPartial<User> }> {
 *   const entityMetadata = context.DATA.entityMetadata;
 *   const method = context.DATA.method;
 *   // ...
 * }
 * ```
 */
export interface IApiSubscriberRouteExecutionContext<E extends IApiBaseEntity, Result = unknown, Input = unknown> extends IApiSubscriberExecutionContext<E, Result, Input> {
	readonly ROUTE_TYPE: EApiRouteType;
}
