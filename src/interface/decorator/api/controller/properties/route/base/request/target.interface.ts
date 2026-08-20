import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiRequestValidator } from "@interface/api/request-validator.interface";
import type { TApiRequestTransformer } from "@type/api-request-transformer.type";

export interface IApiControllerPropertiesRouteBaseRequestTarget<E, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> {
	transformers?: Array<TApiRequestTransformer<E>>;
	validators?: Array<IApiRequestValidator<E, M>>;
}
