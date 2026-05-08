import { EFilterOrderDirection } from "@enum/filter";

export const FUNCTION_API_DECORATOR_CONSTANT: {
	readonly DEFAULT_FILTER_ORDER_BY_DIRECTION: EFilterOrderDirection;
} = {
	DEFAULT_FILTER_ORDER_BY_DIRECTION: EFilterOrderDirection.ASC,
} as const;
