import type { EApiDtoType } from "@enum/decorator/api";
import type { TApiPropertyDescribeDtoProperties } from "@type/decorator/api/property";

export type TApiPropertyDescribeDtoResponseProperties = {
	[EApiDtoType.RESPONSE]?: TApiPropertyDescribeDtoProperties;
};
