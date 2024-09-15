import type { EFilterOrderDirection } from "../../../../../enum";
import type { IApiFilterOrderBy } from "../../filter";

import type { FindManyOptions } from "typeorm";

export type TApiFunctionGetListBaseProperties<E> = {
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
