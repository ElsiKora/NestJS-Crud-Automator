import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "./array";
import type { TApiPropertyDescribeBaseProperties } from "./base-properties.type";

import type { EApiPropertyDescribeType } from "../../../../../enum";

export type TApiPropertyDescribeUuidProperties = TApiPropertyDescribeBaseProperties & {
	description?: string;
	type: EApiPropertyDescribeType.UUID;
} & (TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties);
