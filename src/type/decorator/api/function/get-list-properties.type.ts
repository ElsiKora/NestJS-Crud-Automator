import type { EFilterOrderDirection } from "../../../../enum";

import type { IApiFilterOrderBy } from "../filter";

import type { FindManyOptions } from "typeorm";

type BaseProperties<E> = {
	createdAtFrom?: Date;
	createdAtTo?: Date;
	filter?: FindManyOptions<E>;
	limit: number;
	orderBy?: IApiFilterOrderBy<E>;
	orderDirection?: EFilterOrderDirection;
	page: number;
	receivedAtFrom?: Date;
	receivedAtTo?: Date;
	updatedAtFrom?: Date;
	updatedAtTo?: Date;
};

export type TApiFunctionGetListProperties<E> = BaseProperties<E> & {
	filter?: FindManyOptions<E>;
	orderBy?: IApiFilterOrderBy<E>;
} & {
	[K in Exclude<keyof Omit<E, "createdAt" | "receivedAt" | "updatedAt">, keyof BaseProperties<E>>]?: E[K];
};
