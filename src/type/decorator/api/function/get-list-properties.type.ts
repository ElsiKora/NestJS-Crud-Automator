import type { FindOneOptions } from "typeorm";

export type TApiFunctionGetListProperties<E> = FindOneOptions<E> & {
	limit: number;
	page: number;
};
