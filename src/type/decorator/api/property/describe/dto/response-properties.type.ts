import type { TApiPropertyDescribeDtoProperties } from "./properties.type";

import type { EApiDtoType } from "../../../../../../enum";

export type TApiPropertyDescribeDtoResponseProperties = {
	[EApiDtoType.RESPONSE]?: TApiPropertyDescribeDtoProperties;
};
