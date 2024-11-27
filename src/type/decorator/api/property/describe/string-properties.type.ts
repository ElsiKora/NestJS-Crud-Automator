import type { EApiPropertyDescribeType, EApiPropertyStringType } from "../../../../../enum";

import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "./array";
import type { TApiPropertyDescribeBaseProperties } from "./base-properties.type";
import type { TApiPropertyDescribeExampleProperties } from "./example-properties.type";

export type TApiPropertyDescribeStringProperties = {
	description: string;
	format: EApiPropertyStringType;
	maxLength: number;
	minLength: number;
	pattern: string;
	type: EApiPropertyDescribeType.STRING;
} & (TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties) &
	TApiPropertyDescribeBaseProperties &
	TApiPropertyDescribeExampleProperties<string>;
