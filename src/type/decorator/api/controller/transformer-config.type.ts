import type { EApiControllerRequestTarget, EApiControllerResponseTarget } from "@enum/decorator/api";
import type { TApiRequestTransformer } from "@type/api-request-transformer.type";

export type TApiControllerTransformerConfig<E> = {
	[EApiControllerRequestTarget.BODY]?: Array<TApiRequestTransformer<E>>;
	[EApiControllerRequestTarget.PARAMETERS]?: Array<TApiRequestTransformer<E>>;
	[EApiControllerRequestTarget.QUERY]?: Array<TApiRequestTransformer<E>>;
	[EApiControllerResponseTarget.RESPONSE]?: Array<TApiRequestTransformer<E>>;
};
