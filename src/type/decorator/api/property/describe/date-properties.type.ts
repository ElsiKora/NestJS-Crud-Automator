import type { EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType } from "../../../../../enum";

import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "./array";
import type { TApiPropertyDescribeBaseProperties } from "./base-properties.type";

export type TApiPropertyDescribeDateProperties = {
	format: EApiPropertyDateType;
	identifier: EApiPropertyDateIdentifier;
	type: EApiPropertyDescribeType.DATE;
} & (TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties) &
	TApiPropertyDescribeBaseProperties;
