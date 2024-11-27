import type { EApiPropertyStringType } from "../../../../enum";

import type { TApiPropertyBaseProperties } from "./base";

export type TApiPropertyStringProperties = {
	exampleValue: Array<string> | string;
	format: EApiPropertyStringType;
	maxLength: number;
	minLength: number;
	pattern: string;
} & TApiPropertyBaseProperties;
