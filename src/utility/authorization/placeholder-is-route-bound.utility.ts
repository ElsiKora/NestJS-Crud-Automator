import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationResourceDefinition } from "@interface/class/api/authorization";

/**
 * Tells whether an IAM resource path placeholder binds to the route parameter of its name instead of a column: the
 * resource definition lists it in `routeParameters`. Such a placeholder renders the canonical text of the path value and
 * is never read on a stored row.
 * @template E - Entity type.
 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition of the controller.
 * @param {string} placeholder - Placeholder name.
 * @returns {boolean} Whether the placeholder binds to a route parameter.
 */
export function AuthorizationPlaceholderIsRouteBound<E extends IApiBaseEntity>(resourceDefinition: IApiAuthorizationResourceDefinition<E>, placeholder: string): boolean {
	return resourceDefinition.routeParameters?.includes(placeholder) ?? false;
}
