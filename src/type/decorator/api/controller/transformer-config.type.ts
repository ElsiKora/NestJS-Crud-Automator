import type { EApiDtoType } from "../../../../enum";
import type { TApiRequestTransformer } from "../../../api-request-transformer.type";

export type TApiControllerTransformerConfig<E> = {
	[EApiDtoType.BODY]?: Array<TApiRequestTransformer<E>>;
	[EApiDtoType.QUERY]?: Array<TApiRequestTransformer<E>>;
	[EApiDtoType.REQUEST]?: Array<TApiRequestTransformer<E>>;
	[EApiDtoType.RESPONSE]?: Array<TApiRequestTransformer<E>>;
};
