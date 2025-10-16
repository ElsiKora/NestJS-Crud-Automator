import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberExecutionContext } from "@interface/class/api/subscriber/execution-context.interface";

/**
 * Execution context for route subscriber callbacks.
 * Extends base execution context with route type information.
 */
export interface IApiSubscriberRouteExecutionContext<E extends IApiBaseEntity, Result = unknown, Input = unknown> extends IApiSubscriberExecutionContext<E, Result, Input> {
	readonly ROUTE_TYPE: EApiRouteType;
}
