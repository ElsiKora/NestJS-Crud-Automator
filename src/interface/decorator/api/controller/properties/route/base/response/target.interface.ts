import type { TApiRequestTransformer } from "@type/api-request-transformer.type";

export interface IApiControllerPropertiesRouteBaseResponseTarget<E> {
	transformers?: Array<TApiRequestTransformer<E>>;
}
