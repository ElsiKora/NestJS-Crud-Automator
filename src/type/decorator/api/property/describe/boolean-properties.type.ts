import type { EApiPropertyDescribeType } from "../../../../../enum";

import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "./array";
import type { TApiPropertyDescribeBaseProperties } from "./base-properties.type";

export type TApiPropertyDescribeBooleanProperties = {
	description: string;
	type: EApiPropertyDescribeType.BOOLEAN;
} & (TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties) &
	TApiPropertyDescribeBaseProperties;
