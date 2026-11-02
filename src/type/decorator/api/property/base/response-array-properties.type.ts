import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { Type } from "@nestjs/common";
import type { TApiPropertyBaseArrayResponseProperties, TApiPropertyBaseResponseProperties } from "@type/decorator/api/property";

/** A response-only array property whose bounds are optional; request arrays keep requiring them through TApiPropertyBaseProperties. */
export type TApiPropertyBaseResponseArrayProperties = {
	description?: string;
	entity: IApiBaseEntity | Type<IApiBaseEntity>;
	isNullable?: boolean;
} & TApiPropertyBaseArrayResponseProperties &
	TApiPropertyBaseResponseProperties;
