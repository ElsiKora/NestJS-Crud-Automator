import type { EApiPropertyDescribeType, EApiPropertyNumberType } from "../../../../../enum";

import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "./array";
import type { TApiPropertyDescribeBaseProperties } from "./base-properties.type";
import type { TApiPropertyDescribeExampleProperties } from "./example-properties.type";

export type TApiPropertyDescribeNumberProperties = {
	description: string;
	format: EApiPropertyNumberType;
	maximum: number;
	minimum: number;
	multipleOf: number;
	type: EApiPropertyDescribeType.NUMBER;
} & (TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties) &
	TApiPropertyDescribeBaseProperties &
	TApiPropertyDescribeExampleProperties<number>;
