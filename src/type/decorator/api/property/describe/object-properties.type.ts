import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "./array";
import type { TApiPropertyDescribeBaseProperties } from "./base-properties.type";

import type { EApiPropertyDescribeType } from "../../../../../enum";
import type { Type } from "@nestjs/common";

export type TApiPropertyDescribeObjectProperties = TApiPropertyDescribeBaseProperties & {
	dataType?: [Function] | Function | Record<string, any> | string | Type<unknown>;
	description: string;
	nested?: boolean;
	type: EApiPropertyDescribeType.OBJECT;
} & (TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties);
