import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "./array";
import type { TApiPropertyDescribeBaseProperties } from "./base-properties.type";

import type { EApiPropertyDescribeType } from "../../../../../enum";

export type TApiPropertyDescribeObjectProperties = TApiPropertyDescribeBaseProperties & {
	description: string;
	nested?: boolean;
	type: EApiPropertyDescribeType.OBJECT;
} & (TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties);
