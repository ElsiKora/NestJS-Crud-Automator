import type { EApiControllerRequestTarget, EApiControllerResponseTarget } from "@enum/decorator/api";
import type { TApiRequestTransformer } from "@type/api-request-transformer.type";

import type { TApiControllerRuntimeTransformer } from "./runtime-transformer.type";

export type TApiControllerTransformDataTargets<E> = {
	[EApiControllerRequestTarget.BODY]?: { transformers?: Array<TApiRequestTransformer<E>> };
	[EApiControllerRequestTarget.PARAMETERS]?: { transformers?: Array<TApiControllerRuntimeTransformer<E>> };
	[EApiControllerRequestTarget.QUERY]?: { transformers?: Array<TApiRequestTransformer<E>> };
	[EApiControllerResponseTarget.RESPONSE]?: { transformers?: Array<TApiRequestTransformer<E>> };
};
