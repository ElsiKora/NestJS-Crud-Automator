import type { EApiPropertyDescribeType, EApiPropertyNumberType } from "@enum/decorator/api";
import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "@type/decorator/api/property/describe/array";
import type { TApiPropertyDescribeBaseProperties } from "@type/decorator/api/property/describe/base-properties.type";
import type { TApiPropertyDescribeExampleProperties } from "@type/decorator/api/property/describe/example-properties.type";

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
