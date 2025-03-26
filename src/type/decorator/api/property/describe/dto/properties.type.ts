import type { TApiPropertyDescribeDtoGuardProperties } from "@type/decorator/api/property";

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
