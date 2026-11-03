import type { IApiControllerParametersResourcePathOptions } from "@interface/class/api/controller/parameters-resource-path-options.interface";

import { AuthorizationIsCreateRoute } from "@utility/authorization/is-create-route.utility";
import { AuthorizationIsListRoute } from "@utility/authorization/is-list-route.utility";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Rejects an IAM route, generated or custom, whose path lacks a placeholder of the controller resource path.
 * The guard authorizes before any row is loaded, so it fills a placeholder only from a path value; one it cannot fill renders as `*`, which no Deny on a literal value matches, and the request passes the Deny.
 * A list maps such a placeholder to row exclusions, and a create names no row yet, so both are exempt, by the same predicates IAM evaluates the request with.
 * @param {IApiControllerParametersResourcePathOptions} options - Route description: the IAM action, route type and policy namespace that decide whether the route lists or creates, the resource path, the path parameters of the whole route path, and the route for the error message.
 * @returns {void}
 * @throws {Error} When a route that neither lists nor creates lacks a resource path placeholder in its path.
 */
export function ApiControllerParametersAssertResourcePathPlaceholders(options: IApiControllerParametersResourcePathOptions): void {
	if (AuthorizationIsListRoute(options.routeType, options.action, options.policyNamespace) || AuthorizationIsCreateRoute(options.routeType, options.action, options.policyNamespace)) {
		return;
	}

	const parameters: Set<string> = new Set<string>(options.pathParameters);

	for (const placeholder of options.resourcePath.matchAll(/\{([\w.-]+)\}/g)) {
		const parameter: string = placeholder[1] ?? "";

		if (!parameters.has(parameter)) {
			throw ErrorException(
				`${options.route} names "{${parameter}}" in its IAM resourcePath, which is not a path parameter of the route, and a route that neither lists nor creates renders it as "*", so no Deny on a value of it matches: serve the route with @ApiRouteCustom under the path parameter "${parameter}" copied with ApiPropertyCopy or described with ApiPropertyUUID, an integer ApiPropertyNumber or ApiPropertyString, authorize it in HOOKS mode, or declare it as a list with route.type GET_LIST, whose handler must apply decision.scope.where to its query and whose IAM action becomes "<policyNamespace>:list", so a separate action such as "export" is granted and denied as list`,
			);
		}
	}
}
