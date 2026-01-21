import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization";
import type { IApiControllerProperties } from "@interface/decorator/api/controller/properties.interface";
import type { IApiEntity } from "@interface/entity";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

/**
 * Base data container for route subscriber execution context.
 * Contains route metadata and configuration.
 * This interface provides typed access to the DATA field in route execution contexts.
 * @example
 * ```typescript
 * async onBeforeCreate(
 *   context: IApiSubscriberRouteExecutionContext<
 *     User,
 *     { body: DeepPartial<User> },
 *     IApiSubscriberRouteExecutionContextData<User>
 *   >
 * ): Promise<{ body: DeepPartial<User> }> {
 *   const entityMetadata = context.DATA.entityMetadata;
 *   const method = context.DATA.method;
 *   const methodName = context.DATA.methodName;
 *
 *   return context.result;
 * }
 * ```
 */
export interface IApiSubscriberRouteExecutionContextData<E extends IApiBaseEntity> {
	/**
	 * Entity metadata containing information about entity columns, relations, and configuration.
	 */
	entityMetadata: IApiEntity<E>;

	/**
	 * Route method type (create, update, delete, get, etc.).
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

/**
 * Extended data container for route subscriber execution context.
 * Includes request context (headers, IP, authentication) in addition to base route data.
 */
export interface IApiSubscriberRouteExecutionContextDataExtended<E extends IApiBaseEntity, R = TApiAuthorizationRuleTransformPayload<E>> extends IApiSubscriberRouteExecutionContextData<E> {
	/**
	 * Authentication request information
	 */
	authenticationRequest?: IApiAuthenticationRequest;

	/**
	 * Authorization decision
	 */
	authorizationDecision?: IApiAuthorizationDecision<E, R>;

	/**
	 * HTTP request headers
	 */
	headers: Record<string, string>;

	/**
	 * Client IP address
	 */
	ip: string;
}
