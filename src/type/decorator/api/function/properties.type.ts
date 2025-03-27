import type { EApiFunctionType } from "@enum/decorator/api";
import type { FindOptionsRelations } from "typeorm";

export type TApiFunctionProperties<E> = {
	entity: new () => E;
	relations?: FindOptionsRelations<E>;
	type: EApiFunctionType;
};
