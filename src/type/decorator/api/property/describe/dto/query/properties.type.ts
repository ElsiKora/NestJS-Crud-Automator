import type { TApiPropertyDescribeDtoQueryGetListProperties } from "./get-list-properties.type";
import type { EApiDtoType } from "../../../../../../../enum";
import type { TApiPropertyDescribeDtoProperties } from "../properties.type";

export type TApiPropertyDescribeDtoQueryProperties = {
	[EApiDtoType.QUERY]?: TApiPropertyDescribeDtoProperties & TApiPropertyDescribeDtoQueryGetListProperties;
};
