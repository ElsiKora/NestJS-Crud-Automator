import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import type { IApiAuthorizationResourceFieldDefinition } from "./field-definition.interface";

export interface IApiAuthorizationResourceDefinition<E extends IApiBaseEntity> {
	entity: new () => E;
	fields: ReadonlyArray<IApiAuthorizationResourceFieldDefinition>;
	namespace: string;
	resourcePath: string;
	resourceType: string;
}
