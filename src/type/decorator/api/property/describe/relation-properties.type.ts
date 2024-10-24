import type { TApiPropertyDescribeBaseProperties } from "./base-properties.type";

import type { EApiPropertyDescribeType } from "../../../../../enum";

export type TApiPropertyDescribeRelationProperties = TApiPropertyDescribeBaseProperties & {
	description: string;
	type: EApiPropertyDescribeType.RELATION;
};
