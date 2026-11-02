import type { TApiEntityReference } from "@type/api-entity-reference.type";
import type { TApiPropertyBaseResponseProperties } from "@type/decorator/api/property";

/**
 * A response-only array property. A response documents rows the server returns, so it may leave out a bound the wire does not have;
 * request arrays keep requiring all three bounds through TApiPropertyBaseProperties.
 */
export type TApiPropertyBaseResponseArrayProperties = {
	description?: string;
	entity: TApiEntityReference;
	isArray: true;
	isNullable?: boolean;
	isUniqueItems?: boolean;
	maxItems?: number;
	minItems?: number;
} & TApiPropertyBaseResponseProperties;
