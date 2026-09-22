import type { EApiFunctionType, EApiFunctionUpdatePersistenceMode } from "@enum/decorator/api";
import type { TApiServiceFunctionProperties } from "@type/decorator/api/service/function/properties.type";

export type TApiServiceFunctionPropertiesMap = {
	[EApiFunctionType.CUSTOM]?: never;
	[EApiFunctionType.UPDATE]?: {
		persistenceMode?: EApiFunctionUpdatePersistenceMode;
	} & TApiServiceFunctionProperties;
} & Partial<Record<Exclude<EApiFunctionType, EApiFunctionType.CUSTOM | EApiFunctionType.UPDATE>, { persistenceMode?: never } & TApiServiceFunctionProperties>>;
