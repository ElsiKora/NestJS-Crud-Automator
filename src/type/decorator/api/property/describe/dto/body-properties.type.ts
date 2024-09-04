import type { TApiPropertyDescribeDtoProperties } from "./properties.type";

import type { EApiDtoType } from "../../../../../../enum";

export type TApiPropertyDescribeDtoBodyProperties = {
	[EApiDtoType.BODY]?: TApiPropertyDescribeDtoProperties;
};
