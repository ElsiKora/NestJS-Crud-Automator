import type { EApiFunctionType } from "@enum/decorator/api";
import type { TApiServiceFunctionProperties } from "@type/decorator/api/service/function/properties.type";

export type TApiServiceFunctionPropertiesMap = {
	[EApiFunctionType.CUSTOM]?: never;
} & Partial<Record<Exclude<EApiFunctionType, EApiFunctionType.CUSTOM>, TApiServiceFunctionProperties>>;
