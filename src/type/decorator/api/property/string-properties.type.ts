import type { EApiPropertyStringType } from "@enum/decorator/api";
import type { TApiPropertyBaseProperties } from "@type/decorator/api/property/base";

export type TApiPropertyStringProperties = {
	exampleValue: Array<string> | string;
	format: EApiPropertyStringType;
	maxLength: number;
	minLength: number;
	pattern: string;
} & TApiPropertyBaseProperties;
