import type { EApiControllerLoadRelationsStrategy } from "@enum/decorator/api";
import type { FindOptionsRelations } from "typeorm";

export interface IApiControllerPropertiesRouteBaseRelationsRequestLoad<E> {
	relations?: Array<keyof FindOptionsRelations<E>>;
	relationStrategy?: EApiControllerLoadRelationsStrategy;
	services?: Partial<Record<keyof FindOptionsRelations<E>, string>>;
	serviceStrategy?: EApiControllerLoadRelationsStrategy;
	shouldForceAllServicesToBeSpecified?: boolean;
	shouldLoad: boolean;
}
