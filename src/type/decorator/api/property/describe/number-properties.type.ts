import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "./array";
import type { TApiPropertyDescribeBaseProperties } from "./base-properties.type";

import type { TApiPropertyDescribeExampleProperties } from "./example-properties.type";
import type { EApiPropertyDataType, EApiPropertyDescribeType } from "../../../../../enum";

export type TApiPropertyDescribeNumberProperties = TApiPropertyDescribeBaseProperties & {
	dataType: EApiPropertyDataType;
	description: string;
	format: EApiPropertyDataType;
	maximum: number;
	minimum: number;
	multipleOf: number;
	type: EApiPropertyDescribeType.NUMBER;
} & TApiPropertyDescribeExampleProperties<string, Array<string>> &
	(TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties);
