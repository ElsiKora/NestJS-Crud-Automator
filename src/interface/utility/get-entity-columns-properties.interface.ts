import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

export interface IGetEntityColumnsProperties {
	entity: IApiBaseEntity;
	shouldTakeGeneratedOnly?: boolean;
	shouldTakeRelationsOnly?: boolean;
}
