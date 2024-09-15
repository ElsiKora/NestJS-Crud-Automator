import type { EApiFunctionType } from "../../../../enum";

import type { FindOptionsRelations } from "typeorm";

export type TApiFunctionProperties<E> = {
	entity: new () => E;
	relations?: FindOptionsRelations<E>;
	type: EApiFunctionType;
};
