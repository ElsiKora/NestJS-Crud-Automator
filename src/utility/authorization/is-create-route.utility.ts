import { EApiRouteType } from "@enum/decorator/api";

/**
 * Tells whether IAM evaluates a route as a create: a `CREATE` route, or a route without a type whose action is the `create` action of its policy namespace.
 * A create names no row yet, so a resource path placeholder it cannot fill renders as `*` by design, and a Deny with a `resource.*` condition refuses the whole request.
 * @param {EApiRouteType | undefined} routeType - Route type from the route metadata.
 * @param {string} action - IAM action of the route, `<policyNamespace>:<action>`.
 * @param {string | undefined} policyNamespace - IAM policy namespace of the controller.
 * @returns {boolean} Whether the route is evaluated as a create.
 */
export function AuthorizationIsCreateRoute(routeType: EApiRouteType | undefined, action: string, policyNamespace: string | undefined): boolean {
	return routeType === EApiRouteType.CREATE || (routeType === undefined && policyNamespace !== undefined && action === `${policyNamespace}:create`);
}
