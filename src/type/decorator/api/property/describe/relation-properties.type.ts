import type { EApiPropertyDescribeType } from "../../../../../enum";

import type { TApiPropertyDescribeBaseProperties } from "./base-properties.type";

export type TApiPropertyDescribeRelationProperties = {
	description: string;
	type: EApiPropertyDescribeType.RELATION;
} & TApiPropertyDescribeBaseProperties;
