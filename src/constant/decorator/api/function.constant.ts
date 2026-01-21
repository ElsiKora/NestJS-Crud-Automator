import { EFilterOrderDirection } from "@enum/filter";

const DEFAULT_FILTER_ORDER_BY_DIRECTION: EFilterOrderDirection = EFilterOrderDirection.ASC;

export const FUNCTION_API_DECORATOR_CONSTANT: {
	readonly DEFAULT_FILTER_ORDER_BY_DIRECTION: EFilterOrderDirection;
} = {
	DEFAULT_FILTER_ORDER_BY_DIRECTION,
} as const;
