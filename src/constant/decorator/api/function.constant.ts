import { EFilterOrderDirection } from "../../../enum";

const DEFAULT_FILTER_ORDER_BY_DIRECTION: EFilterOrderDirection = EFilterOrderDirection.ASC;

export const API_FUNCTION_DECORATOR_CONSTANT: {
	readonly DEFAULT_FILTER_ORDER_BY_DIRECTION: EFilterOrderDirection;
} = {
	DEFAULT_FILTER_ORDER_BY_DIRECTION,
} as const;
