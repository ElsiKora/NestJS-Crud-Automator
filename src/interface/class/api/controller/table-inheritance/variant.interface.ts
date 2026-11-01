import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity } from "@interface/entity";

export interface IApiControllerTableInheritanceVariant {
	discriminatorValue: string;
	entity: IApiBaseEntity;
	entityMetadata: IApiEntity<unknown>;
}
