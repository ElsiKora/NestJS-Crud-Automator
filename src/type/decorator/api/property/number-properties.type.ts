import type { EApiPropertyNumberType } from "../../../../enum";

import type { TApiPropertyBaseProperties } from "./base";

export type TApiPropertyNumberProperties = {
	exampleValue?: Array<number> | number;
	format: EApiPropertyNumberType;
	maximum: number;
	minimum: number;
	multipleOf: number;
} & TApiPropertyBaseProperties;
