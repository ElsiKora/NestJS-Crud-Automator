import type { FindOptionsRelations } from "typeorm";

import type { EApiFunctionType } from "../../../../enum";

export type TApiFunctionProperties<E> = {
	entity: new () => E;
	relations?: FindOptionsRelations<E>;
	type: EApiFunctionType;
};
