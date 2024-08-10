import type {BaseEntity, FindManyOptions} from "typeorm"
import {EFilterOrderDirection} from "../../../enum";
import {IApiFilterOrderBy} from "../filter";

type BaseProperties<E extends BaseEntity> = {
	orderDirection?: EFilterOrderDirection;
	orderBy?: IApiFilterOrderBy<E>;
	limit: number;
	page: number;
	createdAtFrom?: Date;
	createdAtTo?: Date;
	updatedAtFrom?: Date;
	updatedAtTo?: Date;
	receivedAtFrom?: Date;
	receivedAtTo?: Date;
	filter?: FindManyOptions<E>;
};

export type TApiFunctionGetListProperties<E extends BaseEntity> = BaseProperties<E> & {
	orderBy?: IApiFilterOrderBy<E>;
	filter?: FindManyOptions<E>;
} & {
	[K in Exclude<keyof Omit<E, "createdAt" | "updatedAt" | "receivedAt">, keyof BaseProperties<E>>]?: E[K];
};
