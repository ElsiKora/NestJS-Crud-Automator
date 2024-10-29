import type { EApiDtoType, EApiRouteType } from "../../../../../../enum";
import type { TApiControllerTransformerConfig } from "../../transformer-config.type";

export type TApiControllerPropertiesRouteBaseRequestTransformers<E, R extends EApiRouteType> = R extends EApiRouteType
	? {
			[EApiRouteType.CREATE]: Pick<TApiControllerTransformerConfig<E>, EApiDtoType.BODY>;
			[EApiRouteType.DELETE]: Pick<TApiControllerTransformerConfig<E>, EApiDtoType.REQUEST>;
			[EApiRouteType.GET_LIST]: Pick<TApiControllerTransformerConfig<E>, EApiDtoType.QUERY>;
			[EApiRouteType.GET]: Pick<TApiControllerTransformerConfig<E>, EApiDtoType.REQUEST>;
			[EApiRouteType.PARTIAL_UPDATE]: Pick<TApiControllerTransformerConfig<E>, EApiDtoType.BODY | EApiDtoType.REQUEST>;
			[EApiRouteType.UPDATE]: Pick<TApiControllerTransformerConfig<E>, EApiDtoType.BODY | EApiDtoType.REQUEST>;
		}[R]
	: never;
