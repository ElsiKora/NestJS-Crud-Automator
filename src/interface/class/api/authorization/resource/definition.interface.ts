import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationResourceFieldDefinition } from "@interface/class/api/authorization/resource/field-definition.interface";

export interface IApiAuthorizationResourceDefinition<E extends IApiBaseEntity> {
	entity: new () => E;
	fields: ReadonlyArray<IApiAuthorizationResourceFieldDefinition>;
	namespace: string;
	resourcePath: string;
	resourceType: string;
	// Placeholders of `resourcePath` that read the route parameter of the same name and no column: a pattern compares the canonical text of the path value, and a list or a create, which carries no such value, cannot be narrowed by it.
	routeParameters?: ReadonlyArray<string>;
}
