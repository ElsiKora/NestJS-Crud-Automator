import type { EApiFunctionUpdatePersistenceMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionProperties } from "@interface/decorator/api/function/properties.interface";

export interface IApiFunctionUpdateProperties<E extends IApiBaseEntity> extends IApiFunctionProperties<E> {
	persistenceMode?: EApiFunctionUpdatePersistenceMode;
}
