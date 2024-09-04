import type { TApiPropertyDescribeDtoProperties } from "./properties.type";

import type { EApiDtoType } from "../../../../../../enum";

export type TApiPropertyDescribeDtoRequestProperties = {
	[EApiDtoType.REQUEST]?: TApiPropertyDescribeDtoProperties;
};
