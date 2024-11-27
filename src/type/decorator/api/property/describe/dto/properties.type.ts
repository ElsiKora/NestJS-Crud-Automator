import type { TApiPropertyDescribeDtoGuardProperties } from "./guard-properties.type";

export type TApiPropertyDescribeDtoProperties = {
	guard?: TApiPropertyDescribeDtoGuardProperties;
	isEnabled?: boolean;
} & (
	| {
			isExpose?: boolean;
			isResponse: true;
	  }
	| {
			isRequired: boolean;
			isResponse?: false;
	  }
);
