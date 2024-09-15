import type { FindManyOptions } from "typeorm";

export type TApiFunctionGetProperties<E> = {
	filter?: FindManyOptions<E>;
} & {
	[K in keyof E]?: E[K];
};
