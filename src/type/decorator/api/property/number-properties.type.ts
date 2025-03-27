import type { EApiPropertyNumberType } from "@enum/decorator/api";
import type { TApiPropertyBaseProperties } from "@type/decorator/api/property/base";

export type TApiPropertyNumberProperties = {
	exampleValue?: Array<number> | number;
	format: EApiPropertyNumberType;
	maximum: number;
	minimum: number;
	multipleOf: number;
} & TApiPropertyBaseProperties;
