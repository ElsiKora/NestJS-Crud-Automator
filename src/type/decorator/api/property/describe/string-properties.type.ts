import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "./array";
import type { TApiPropertyDescribeBaseProperties } from "./base-properties.type";

import type { TApiPropertyDescribeExampleProperties } from "./example-properties.type";
import type { EApiPropertyDataType, EApiPropertyDescribeType } from "../../../../../enum";

export type TApiPropertyDescribeStringProperties = TApiPropertyDescribeBaseProperties & {
	dataType: EApiPropertyDataType;
	description: string;
	format: EApiPropertyDataType;
	maxLength: number;
	minLength: number;
	pattern: string;
	type: EApiPropertyDescribeType.STRING;
} & TApiPropertyDescribeExampleProperties<string, Array<string>> &
	(TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties);
