import type { EApiPropertyDescribeType } from "@enum/decorator/api";
import type { TApiPropertyDescribeBaseProperties } from "@type/decorator/api/property/describe/base-properties.type";

export type TApiPropertyDescribeRelationProperties = {
	description: string;
	type: EApiPropertyDescribeType.RELATION;
} & TApiPropertyDescribeBaseProperties;
