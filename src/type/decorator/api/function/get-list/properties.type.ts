import type { TApiFunctionGetListBaseProperties } from "./base-properties.type";

import type { IApiFilterOrderBy } from "../../filter";
import type { FindManyOptions } from "typeorm";

export type TApiFunctionGetListProperties<E> = TApiFunctionGetListBaseProperties<E> & {
	filter?: FindManyOptions<E>;
	orderBy?: IApiFilterOrderBy<E>;
} & {
	[K in Exclude<keyof Omit<E, "createdAt" | "receivedAt" | "updatedAt">, keyof TApiFunctionGetListBaseProperties<E>>]?: E[K];
};
