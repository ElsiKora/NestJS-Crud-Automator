import type { EApiPropertyDescribeType, EApiPropertyStringType } from "@enum/decorator/api";
import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "@type/decorator/api/property/describe/array";
import type { TApiPropertyDescribeBaseProperties } from "@type/decorator/api/property/describe/base-properties.type";
import type { TApiPropertyDescribeExampleProperties } from "@type/decorator/api/property/describe/example-properties.type";

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
