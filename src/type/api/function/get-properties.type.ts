import type {BaseEntity, FindManyOptions} from "typeorm"

export type TApiFunctionGetProperties<E extends BaseEntity> =  {
    filter?: FindManyOptions<E>;
} & {
    [K in keyof E]?: E[K];
};
