import type { TApiPropertyBaseProperties } from "./base";

export type TApiPropertyEnumProperties = {
	enum: Record<string, number | string>;
	enumName: string;
	exampleValue?: number | string;
} & TApiPropertyBaseProperties;
