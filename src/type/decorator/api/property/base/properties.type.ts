import type { TApiEntityReference } from "@type/api-entity-reference.type";
import type { TApiPropertyBaseArrayOptionalProperties, TApiPropertyBaseArrayRequiredProperties, TApiPropertyBaseRequestProperties, TApiPropertyBaseResponseProperties } from "@type/decorator/api/property";

export type TApiPropertyBaseProperties = {
	description?: string;
	entity: TApiEntityReference;
	isNullable?: boolean;
} & (TApiPropertyBaseArrayOptionalProperties | TApiPropertyBaseArrayRequiredProperties) &
	(TApiPropertyBaseRequestProperties | TApiPropertyBaseResponseProperties);
