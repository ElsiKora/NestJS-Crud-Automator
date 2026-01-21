import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization";
import type { IApiControllerProperties } from "@interface/decorator/api/controller/properties.interface";
import type { IApiEntity } from "@interface/entity";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";
import type { DeepPartial } from "typeorm";

/**
 * Base data container for route subscriber execution context.
 * Contains route metadata, configuration, and the current authorization decision (when available).
 * This interface provides typed access to the DATA field in route execution contexts.
 * @example
 * ```typescript
 * async onBeforeCreate(
 *   context: IApiSubscriberRouteExecutionContext<
 *     User,
 *     { body: DeepPartial<User> },
 *     IApiSubscriberRouteExecutionContextData<User, User>
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
export interface IApiSubscriberRouteExecutionContextData<E extends IApiBaseEntity, R = TApiAuthorizationRuleTransformPayload<E>> {
	/**
	 * Authorization decision attached to the request (if present).
	 */
	authorizationDecision?: IApiAuthorizationDecision<E, R>;

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
export interface IApiSubscriberRouteExecutionContextDataExtended<E extends IApiBaseEntity, R = TApiAuthorizationRuleTransformPayload<E>> extends IApiSubscriberRouteExecutionContextData<E, R> {
	/**
	 * Authentication request information
	 */
	authenticationRequest?: IApiAuthenticationRequest;

	/**
	 * Request body payload (for create/update routes)
	 */
	body?: DeepPartial<E>;

	/**
	 * HTTP request headers
	 */
	headers: Record<string, string>;

	/**
	 * Client IP address
	 */
	ip: string;

	/**
	 * Route parameters (for get/delete/update routes)
	 */
	parameters?: Partial<E>;

	/**
	 * Query payload (for get list routes)
	 */
	query?: TApiControllerGetListQuery<E>;
}
