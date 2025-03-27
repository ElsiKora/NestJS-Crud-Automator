import type { EApiRouteType } from "@enum/decorator/api";
import type { TApiControllerPropertiesRouteBaseResponseTransformers } from "@type/decorator/api/controller";
import type { FindOptionsRelations } from "typeorm";

export interface IApiControllerPropertiesRouteBaseResponse<E, R extends EApiRouteType> {
	relations?: FindOptionsRelations<E>;
	transformers?: TApiControllerPropertiesRouteBaseResponseTransformers<E, R>;
}
