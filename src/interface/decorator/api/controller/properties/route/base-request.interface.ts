import type { EApiRouteType } from "../../../../../../enum";
import type { TApiControllerPropertiesRouteBaseRequestRelations, TApiControllerPropertiesRouteBaseRequestTransformers } from "../../../../../../type";
import type { IApiRequestValidator } from "../../../../../api-request-validator.interface";

export interface IApiControllerPropertiesRouteBaseRequest<E, R extends EApiRouteType> {
	relations?: TApiControllerPropertiesRouteBaseRequestRelations<E>;
	transformers?: TApiControllerPropertiesRouteBaseRequestTransformers<E, R>;
	validators?: Array<IApiRequestValidator<E>>;
}
