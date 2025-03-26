import type { EApiDtoType } from "@enum/decorator/api";
import type { TApiRequestTransformer } from "@type/api-request-transformer.type";

export type TApiControllerTransformerConfig<E> = {
	[EApiDtoType.BODY]?: Array<TApiRequestTransformer<E>>;
	[EApiDtoType.QUERY]?: Array<TApiRequestTransformer<E>>;
	[EApiDtoType.REQUEST]?: Array<TApiRequestTransformer<E>>;
	[EApiDtoType.RESPONSE]?: Array<TApiRequestTransformer<E>>;
};
