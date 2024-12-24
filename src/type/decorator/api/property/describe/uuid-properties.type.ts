import type { EApiPropertyDescribeType } from "../../../../../enum";

import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "./array";
import type { TApiPropertyDescribeBaseProperties } from "./base-properties.type";

export type TApiPropertyDescribeUuidProperties = {
	description?: string;
	type: EApiPropertyDescribeType.UUID;
} & (TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties) &
	TApiPropertyDescribeBaseProperties;
