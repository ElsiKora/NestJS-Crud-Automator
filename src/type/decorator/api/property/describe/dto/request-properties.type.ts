import type { EApiDtoType } from "@enum/decorator/api";
import type { TApiPropertyDescribeDtoProperties } from "@type/decorator/api/property";

export type TApiPropertyDescribeDtoRequestProperties = {
	[EApiDtoType.REQUEST]?: TApiPropertyDescribeDtoProperties;
};
