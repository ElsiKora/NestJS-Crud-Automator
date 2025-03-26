import type { EApiPropertyDescribeType } from "@enum/decorator/api";
import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "@type/decorator/api/property/describe/array";
import type { TApiPropertyDescribeBaseProperties } from "@type/decorator/api/property/describe/base-properties.type";

export type TApiPropertyDescribeUuidProperties = {
	description?: string;
	type: EApiPropertyDescribeType.UUID;
} & (TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties) &
	TApiPropertyDescribeBaseProperties;
