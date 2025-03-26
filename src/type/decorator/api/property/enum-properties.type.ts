import type { TApiPropertyBaseProperties } from "@type/decorator/api/property/base";

export type TApiPropertyEnumProperties = {
	enum: Record<string, number | string>;
	enumName: string;
	exampleValue?: number | string;
} & TApiPropertyBaseProperties;
