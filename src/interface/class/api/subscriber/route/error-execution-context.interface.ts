import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberErrorExecutionContext } from "@interface/class/api/subscriber/error-execution-context.interface";

/**
 * Error execution context for route subscriber callbacks.
 * Contains route type information but no result field.
 * @template E - Entity type extending IApiBaseEntity
 * @template Input - Type of the DATA field (immutable context data). Use IApiSubscriberRouteExecutionContextData<E, R> or IApiSubscriberRouteExecutionContextDataExtended<E, R> for typed access.
 */
export interface IApiSubscriberRouteErrorExecutionContext<E extends IApiBaseEntity, Input = unknown> extends IApiSubscriberErrorExecutionContext<E, Input> {
	readonly ROUTE_TYPE: EApiRouteType;
}
