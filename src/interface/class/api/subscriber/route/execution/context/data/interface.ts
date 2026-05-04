import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization";
import type { IApiControllerProperties } from "@interface/decorator/api/controller/properties.interface";
import type { IApiEntity } from "@interface/entity";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

/**
 * Base data container for route subscriber execution context.
 * Contains route metadata, configuration, and the current authorization decision when available.
 */
export interface IApiSubscriberRouteExecutionContextData<E extends IApiBaseEntity, R = TApiAuthorizationRuleTransformPayload<E>> {
	/**
	 * Authorization decision attached to the request.
	 */
	authorizationDecision?: IApiAuthorizationDecision<E, R>;

	/**
	 * Entity metadata containing information about entity columns, relations, and configuration.
	 */
	entityMetadata: IApiEntity<E>;

	/**
	 * Route method type.
	 */
	method: EApiRouteType;

	/**
	 * Controller method name as defined in the controller.
	 */
	methodName: string;

	/**
	 * Controller properties and configuration for the current route.
	 */
	properties: IApiControllerProperties<E>;
}
