import type { IApiBaseEntity } from "../../../../../interface";

import type { TApiPropertyBaseArrayOptionalProperties, TApiPropertyBaseArrayRequiredProperties } from "./array";
import type { TApiPropertyBaseRequestProperties } from "./request-properties.type";
import type { TApiPropertyBaseResponseProperties } from "./response-properties.type";

export type TApiPropertyBaseProperties = {
	description?: string;
	entity: IApiBaseEntity;
	isNullable?: boolean;
} & (TApiPropertyBaseArrayOptionalProperties | TApiPropertyBaseArrayRequiredProperties) &
	(TApiPropertyBaseRequestProperties | TApiPropertyBaseResponseProperties);
