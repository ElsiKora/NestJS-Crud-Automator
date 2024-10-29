import type { TApiFunctionCreateProperties } from "../../../../type";
import type { IApiBaseEntity } from "../../../api-base-entity.interface";
import type { Repository } from "typeorm";

export interface IApiFunctionCreateExecutorProperties<E extends IApiBaseEntity> {
	entity: IApiBaseEntity;
	properties: TApiFunctionCreateProperties<E>;
	repository: Repository<E>;
}
