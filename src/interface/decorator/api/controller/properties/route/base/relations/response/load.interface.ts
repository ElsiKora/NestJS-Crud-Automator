import type { FindOptionsRelations } from "typeorm";

export interface IApiControllerPropertiesRouteBaseRelationsResponseLoad<E> {
	include?: FindOptionsRelations<E>;
}
