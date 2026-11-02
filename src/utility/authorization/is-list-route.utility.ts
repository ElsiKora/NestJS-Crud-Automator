import { EApiRouteType } from "@enum/decorator/api";

/**
 * Tells whether IAM evaluates a route as a list: a `GET_LIST` route, or a route without a type whose action is the `list` action of its policy namespace.
 * Only a list maps a resource path placeholder it cannot fill to row exclusions; on any other route such a placeholder renders as `*`, which no Deny on a literal value matches.
 * @param {EApiRouteType | undefined} routeType - Route type from the route metadata.
 * @param {string} action - IAM action of the route, `<policyNamespace>:<action>`.
 * @param {string | undefined} policyNamespace - IAM policy namespace of the controller.
 * @returns {boolean} Whether the route is evaluated as a list.
 */
export function AuthorizationIsListRoute(routeType: EApiRouteType | undefined, action: string, policyNamespace: string | undefined): boolean {
	return routeType === EApiRouteType.GET_LIST || (routeType === undefined && policyNamespace !== undefined && action === `${policyNamespace}:list`);
}
