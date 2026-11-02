import { REQUEST_BODY_SHAPE_CONSTANT } from "@constant/request-body-shape.constant";

export const ARRAY_UNIQUE_ITEMS_CONSTANT: { MAXIMUM_DEPTH: number } = {
	MAXIMUM_DEPTH: REQUEST_BODY_SHAPE_CONSTANT.MAXIMUM_DEPTH,
} as const;
