import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiPropertyBaseArrayOptionalProperties, TApiPropertyBaseArrayRequiredProperties, TApiPropertyBaseRequestProperties, TApiPropertyBaseResponseProperties } from "@type/decorator/api/property";

export type TApiPropertyBaseProperties = {
	description?: string;
	entity: IApiBaseEntity;
	isNullable?: boolean;
} & (TApiPropertyBaseArrayOptionalProperties | TApiPropertyBaseArrayRequiredProperties) &
	(TApiPropertyBaseRequestProperties | TApiPropertyBaseResponseProperties);
