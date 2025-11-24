import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { Type } from "@nestjs/common";
import type { TApiPropertyBaseArrayOptionalProperties, TApiPropertyBaseArrayRequiredProperties, TApiPropertyBaseRequestProperties, TApiPropertyBaseResponseProperties } from "@type/decorator/api/property";

export type TApiPropertyBaseProperties = {
	description?: string;
	entity: IApiBaseEntity | Type<IApiBaseEntity>;
	isNullable?: boolean;
} & (TApiPropertyBaseArrayOptionalProperties | TApiPropertyBaseArrayRequiredProperties) &
	(TApiPropertyBaseRequestProperties | TApiPropertyBaseResponseProperties);
