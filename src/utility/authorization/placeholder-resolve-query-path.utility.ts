import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationResourceDefinition, IApiAuthorizationResourceFieldDefinition } from "@interface/class/api/authorization";
import type { IApiControllerPropertiesPathScope, IApiControllerPropertiesPathScopeParameter } from "@interface/decorator/api/controller/properties/path-scope";

/**
 * Resolves the entity query path that an IAM resource path placeholder names on the stored row. The field that maps
 * `resource.<placeholder>` comes first, then the path scope binding of the path parameter of that name, then the entity
 * property of that name. The startup check of a path value and the stored-row comparison of the IAM engine read the
 * same column this way.
 * @template E - Entity type.
 * @param {IApiAuthorizationResourceDefinition<E>} resourceDefinition - IAM resource definition of the controller.
 * @param {string} placeholder - Placeholder name.
 * @param {IApiControllerPropertiesPathScope<E>} [pathScope] - Path scope of the controller, when it declares one.
 * @returns {string} The query path of the column the placeholder names.
 */
export function AuthorizationPlaceholderResolveQueryPath<E extends IApiBaseEntity>(resourceDefinition: IApiAuthorizationResourceDefinition<E>, placeholder: string, pathScope?: IApiControllerPropertiesPathScope<E>): string {
	const field: IApiAuthorizationResourceFieldDefinition | undefined = resourceDefinition.fields.find((candidate: IApiAuthorizationResourceFieldDefinition): boolean => candidate.path === `resource.${placeholder}`);

	if (field) {
		return field.queryPath;
	}

	const binding: IApiControllerPropertiesPathScopeParameter<E> | undefined = pathScope?.parameters.find((candidate: IApiControllerPropertiesPathScopeParameter<E>): boolean => candidate.parameter === placeholder);

	return binding ? binding.field : placeholder;
}
