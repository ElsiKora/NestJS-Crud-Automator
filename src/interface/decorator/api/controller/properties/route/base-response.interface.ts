import type { FindOptionsRelations } from "typeorm";

import type { EApiRouteType } from "../../../../../../enum";
import type { TApiControllerPropertiesRouteBaseResponseTransformers } from "../../../../../../type";

export interface IApiControllerPropertiesRouteBaseResponse<E, R extends EApiRouteType> {
	relations?: FindOptionsRelations<E>;
	transformers?: TApiControllerPropertiesRouteBaseResponseTransformers<E, R>;
}
