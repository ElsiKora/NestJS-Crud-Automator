import type { EApiPropertyDateIdentifier, EApiPropertyDateType } from "@enum/decorator/api";
import type { TApiPropertyBaseProperties, TApiPropertyBaseResponseArrayProperties } from "@type/decorator/api/property/base";

export type TApiPropertyDateProperties = {
	format: EApiPropertyDateType;
	identifier: EApiPropertyDateIdentifier;
} & (TApiPropertyBaseProperties | TApiPropertyBaseResponseArrayProperties);
