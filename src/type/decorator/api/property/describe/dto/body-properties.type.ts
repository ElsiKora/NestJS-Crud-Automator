import type { EApiDtoType } from "../../../../../../enum";

import type { TApiPropertyDescribeDtoProperties } from "./properties.type";

export type TApiPropertyDescribeDtoBodyProperties = {
	[EApiDtoType.BODY]?: TApiPropertyDescribeDtoProperties;
};
