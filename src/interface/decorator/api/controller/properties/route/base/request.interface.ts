import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiRequestValidator } from "@interface/api/request-validator.interface";
import type { TApiControllerPropertiesRouteBaseRequestRelations, TApiControllerPropertiesRouteBaseRequestTransformers } from "@type/decorator/api/controller";

export interface IApiControllerPropertiesRouteBaseRequest<E, R extends EApiRouteType> {
	relations?: TApiControllerPropertiesRouteBaseRequestRelations<E>;
	transformers?: TApiControllerPropertiesRouteBaseRequestTransformers<E, R>;
	validators?: Array<IApiRequestValidator<E>>;
}
