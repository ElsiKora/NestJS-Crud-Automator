import type { TApiPropertyBaseProperties, TApiPropertyBaseResponseArrayProperties } from "@type/decorator/api/property/base";

export type TApiPropertyEnumProperties = {
	enum: Record<string, number | string>;
	enumName: string;
	exampleValue?: number | string;
} & (TApiPropertyBaseProperties | TApiPropertyBaseResponseArrayProperties);
