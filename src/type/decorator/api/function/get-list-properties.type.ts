import type { FindManyOptions } from "typeorm/index";

export type TApiFunctionGetListProperties<E> = FindManyOptions<E>;
