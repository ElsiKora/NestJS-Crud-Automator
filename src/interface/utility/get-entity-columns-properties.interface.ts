import type { IApiBaseEntity } from "../api-base-entity.interface";

export interface IGetEntityColumnsProperties {
	entity: IApiBaseEntity;
	shouldTakeGeneratedOnly?: boolean;
	shouldTakeRelationsOnly?: boolean;
}
