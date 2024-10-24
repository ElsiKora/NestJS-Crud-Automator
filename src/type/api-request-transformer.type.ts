import type { TRANSFORMER_VALUE_DTO_CONSTANT } from "../constant/dto/transformer-value.constant";
import type { EApiControllerRequestTransformerType } from "../enum";
import type {IApiGetListResponseResult} from "../interface";
import type {TApiFunctionGetListProperties} from "./decorator";

export type TApiRequestTransformer<E> = {
	key: keyof Partial<E> | keyof IApiGetListResponseResult<E> | keyof TApiFunctionGetListProperties<E>;
} & (
	| {
			type: EApiControllerRequestTransformerType.DYNAMIC;
			value: (typeof TRANSFORMER_VALUE_DTO_CONSTANT)[keyof typeof TRANSFORMER_VALUE_DTO_CONSTANT];
	  }
	| {
			type: EApiControllerRequestTransformerType.STATIC;
			value: string;
	  }
);
