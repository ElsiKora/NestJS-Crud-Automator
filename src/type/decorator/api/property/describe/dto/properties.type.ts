import type { TApiPropertyDescribeDtoGuardProperties } from "@type/decorator/api/property";

export type TApiPropertyDescribeDtoProperties = {
	guard?: TApiPropertyDescribeDtoGuardProperties;
	isEnabled?: boolean;
	isRequired?: boolean;
	isResponse?: boolean;
} & (
	| {
			isExpose?: boolean;
			isResponse: true;
	  }
	| {
			isExpose?: never;
			isResponse?: false;
	  }
);
