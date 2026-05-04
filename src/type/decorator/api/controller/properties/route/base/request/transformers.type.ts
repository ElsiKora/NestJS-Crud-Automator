import type { EApiControllerRequestTarget, EApiRouteType } from "@enum/decorator/api";
import type { TApiControllerTransformerConfig } from "@type/decorator/api/controller";

export type TApiControllerPropertiesRouteBaseRequestTransformers<E, R extends EApiRouteType> = R extends EApiRouteType
	? {
			[EApiRouteType.CREATE]: Pick<TApiControllerTransformerConfig<E>, EApiControllerRequestTarget.BODY>;
			[EApiRouteType.DELETE]: Pick<TApiControllerTransformerConfig<E>, EApiControllerRequestTarget.PARAMETERS>;
			[EApiRouteType.GET_LIST]: Pick<TApiControllerTransformerConfig<E>, EApiControllerRequestTarget.QUERY>;
			[EApiRouteType.GET]: Pick<TApiControllerTransformerConfig<E>, EApiControllerRequestTarget.PARAMETERS>;
			[EApiRouteType.PARTIAL_UPDATE]: Pick<TApiControllerTransformerConfig<E>, EApiControllerRequestTarget.BODY | EApiControllerRequestTarget.PARAMETERS>;
			[EApiRouteType.UPDATE]: Pick<TApiControllerTransformerConfig<E>, EApiControllerRequestTarget.BODY | EApiControllerRequestTarget.PARAMETERS>;
		}[R]
	: never;
