import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { TApiControllerTransformerConfig } from "@type/decorator/api/controller";

export type TApiControllerPropertiesRouteBaseResponseTransformers<E, R extends EApiRouteType> = R extends EApiRouteType
	? {
			[EApiRouteType.CREATE]: Pick<TApiControllerTransformerConfig<E>, EApiDtoType.RESPONSE>;
			[EApiRouteType.DELETE]: never;
			[EApiRouteType.GET_LIST]: Pick<TApiControllerTransformerConfig<E>, EApiDtoType.RESPONSE>;
			[EApiRouteType.GET]: Pick<TApiControllerTransformerConfig<E>, EApiDtoType.RESPONSE>;
			[EApiRouteType.PARTIAL_UPDATE]: Pick<TApiControllerTransformerConfig<E>, EApiDtoType.RESPONSE>;
			[EApiRouteType.UPDATE]: Pick<TApiControllerTransformerConfig<E>, EApiDtoType.RESPONSE>;
		}[R]
	: never;
