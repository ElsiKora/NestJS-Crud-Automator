import type { TRANSFORMER_VALUE_DTO_CONSTANT } from "../constant/dto/transformer-value.constant";
import type { EApiControllerRequestTransformerType } from "../enum";
import type { IApiGetListResponseResult } from "../interface";

export type TApiRequestTransformer<E> = {
	key:
		| keyof {
				limit: number;
				page: number;
		  }
		| keyof IApiGetListResponseResult<E>
		| keyof Partial<E>;
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
