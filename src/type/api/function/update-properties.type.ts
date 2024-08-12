import {BaseEntity} from "typeorm";

export type TApiFunctionUpdateProperties<E extends BaseEntity> = Partial<E>;
