import type { FindOneOptions, FindOptionsRelations } from "typeorm";

export interface IApiControllerPropertiesRouteBaseRelationsResponseLoad<E> {
	include?: FindOptionsRelations<E>;
	relationLoadStrategy?: NonNullable<FindOneOptions<E>["relationLoadStrategy"]>;
}
