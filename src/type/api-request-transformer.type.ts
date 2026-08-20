import type { TRANSFORMER_VALUE_DTO_CONSTANT } from "@constant/dto";
import type { EApiControllerRequestTransformerType } from "@enum/decorator/api";
import type { IApiGetListCursorResponseResult, IApiGetListResponseResult } from "@interface/decorator/api";

export type TApiRequestTransformer<E> = {
	key:
		| keyof {
				after: string;
				before: string;
				limit: number;
				page: number;
		  }
		| keyof IApiGetListCursorResponseResult<E>
		| keyof IApiGetListResponseResult<E>
		| keyof Partial<E>;
	shouldSetValueEvenIfMissing?: boolean;
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
