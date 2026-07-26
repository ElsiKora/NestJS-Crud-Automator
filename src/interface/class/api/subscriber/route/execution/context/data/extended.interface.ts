import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiSubscriberRouteExecutionContextData } from "@interface/class/api/subscriber/route/execution/context/data/interface";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";
import type { DeepPartial } from "typeorm";

/**
 * Extended data container for route subscriber execution context.
 * Includes request context in addition to base route data.
 */
export interface IApiSubscriberRouteExecutionContextDataExtended<E extends IApiBaseEntity, R = TApiAuthorizationRuleTransformPayload<E>> extends IApiSubscriberRouteExecutionContextData<E, R> {
	/**
	 * Authentication request information.
	 */
	authenticationRequest?: IApiAuthenticationRequest;

	/**
	 * Request body payload for create and update routes.
	 */
	body?: DeepPartial<E>;

	/**
	 * HTTP request headers.
	 */
	headers: Record<string, string>;

	/**
	 * Client IP address.
	 */
	ip: string;

	/**
	 * Route parameters for get, delete, and update routes.
	 */
	parameters?: Partial<E>;

	/**
	 * Query payload for get list routes.
	 */
	query?: TApiControllerGetListQuery<E>;
}
