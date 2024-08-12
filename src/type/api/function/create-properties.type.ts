import {BaseEntity} from "typeorm";

export type TApiFunctionCreateProperties<E extends BaseEntity> = Partial<E>;
