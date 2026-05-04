import type { EApiControllerResponseTarget, EApiRouteType } from "@enum/decorator/api";
import type { TApiControllerTransformerConfig } from "@type/decorator/api/controller";

export type TApiControllerPropertiesRouteBaseResponseTransformers<E, R extends EApiRouteType> = R extends EApiRouteType
	? {
			[EApiRouteType.CREATE]: Pick<TApiControllerTransformerConfig<E>, EApiControllerResponseTarget.RESPONSE>;
			[EApiRouteType.DELETE]: never;
			[EApiRouteType.GET_LIST]: Pick<TApiControllerTransformerConfig<E>, EApiControllerResponseTarget.RESPONSE>;
			[EApiRouteType.GET]: Pick<TApiControllerTransformerConfig<E>, EApiControllerResponseTarget.RESPONSE>;
			[EApiRouteType.PARTIAL_UPDATE]: Pick<TApiControllerTransformerConfig<E>, EApiControllerResponseTarget.RESPONSE>;
			[EApiRouteType.UPDATE]: Pick<TApiControllerTransformerConfig<E>, EApiControllerResponseTarget.RESPONSE>;
		}[R]
	: never;
