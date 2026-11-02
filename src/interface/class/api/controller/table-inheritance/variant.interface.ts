import type { IApiEntity } from "@interface/entity";
import type { TApiEntityReference } from "@type/api-entity-reference.type";

export interface IApiControllerTableInheritanceVariant {
	discriminatorValue: string;
	entity: TApiEntityReference;
	entityMetadata: IApiEntity<unknown>;
}
