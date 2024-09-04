import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "./array";
import type { TApiPropertyDescribeBaseProperties } from "./base-properties.type";

import type { EApiPropertyDateType, EApiPropertyDescribeType } from "../../../../../enum";

export type TApiPropertyDescribeDateProperties = TApiPropertyDescribeBaseProperties & {
	dataType: EApiPropertyDateType;
	type: EApiPropertyDescribeType.DATE;
} & (TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties);
