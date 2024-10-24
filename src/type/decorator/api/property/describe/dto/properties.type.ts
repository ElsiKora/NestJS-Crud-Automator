import type { TApiPropertyDescribeDtoGuardProperties } from "./guard-properties.type";

export type TApiPropertyDescribeDtoProperties = {
	enabled?: boolean;
	expose?: boolean;
	guard?: TApiPropertyDescribeDtoGuardProperties;
	required?: boolean;
	response?: boolean;
};
