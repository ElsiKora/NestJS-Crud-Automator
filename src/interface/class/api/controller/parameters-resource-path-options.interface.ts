import type { EApiRouteType } from "@enum/decorator/api";

export interface IApiControllerParametersResourcePathOptions {
	/** IAM action of the route, `<policyNamespace>:<action>`. */
	action: string;
	/** Names IAM reads path values under: the path parameters of the whole route path, global prefix, `RouterModule` path, controller path, and route path, and the entity field a generated GET identity parameter names. */
	pathParameters: ReadonlyArray<string>;
	/** IAM policy namespace of the controller. */
	policyNamespace: string | undefined;
	/** IAM resource path of the controller. */
	resourcePath: string;
	/** Controller and method, for the error message. */
	route: string;
	/** Route type from the route metadata, undefined on a custom route that declares none. */
	routeType: EApiRouteType | undefined;
}
