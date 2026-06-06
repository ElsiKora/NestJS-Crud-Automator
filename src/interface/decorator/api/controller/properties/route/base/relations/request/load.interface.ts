import type { FindOneOptions, FindOptionsRelations } from "typeorm";

export interface IApiControllerPropertiesRouteBaseRelationsRequestLoad<E> {
	include: FindOptionsRelations<E>;
	relationLoadStrategy?: FindOneOptions<E>["relationLoadStrategy"];
	services?: Partial<Record<keyof FindOptionsRelations<E>, string>>;
}
