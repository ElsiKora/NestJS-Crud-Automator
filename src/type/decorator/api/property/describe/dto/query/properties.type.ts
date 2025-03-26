import type { EApiDtoType } from "@enum/decorator/api";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeDtoQueryGetListProperties } from "@type/decorator/api/property";

export type TApiPropertyDescribeDtoQueryProperties = {
	[EApiDtoType.QUERY]?: TApiPropertyDescribeDtoProperties & TApiPropertyDescribeDtoQueryGetListProperties;
};
