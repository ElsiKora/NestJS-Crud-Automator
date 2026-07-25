import type { TManualDtoPropertyMetadata } from "@type/utility/dto/manual-property-metadata.type";

import { MANUAL_PROPERTY_METADATA_DTO_UTILITY_CONSTANT } from "@constant/utility/dto/manual-property-metadata.constant";

/**
 * Stores replayable decorator metadata for manual DTO properties so nested DTO wrappers can be
 * materialized per auto-generated parent context.
 * @param {object} target - Decorated DTO prototype.
 * @param {string | symbol} propertyKey - Decorated property key.
 * @param {TManualDtoPropertyMetadata} metadata - Replayable decorator metadata.
 */
export function RegisterManualDtoPropertyMetadata(target: object, propertyKey: string | symbol, metadata: TManualDtoPropertyMetadata): void {
	if (!target) {
		return;
	}

	const registry: Map<string | symbol, TManualDtoPropertyMetadata> = new Map<string | symbol, TManualDtoPropertyMetadata>(Reflect.getMetadata?.(MANUAL_PROPERTY_METADATA_DTO_UTILITY_CONSTANT.KEY, target) as Map<string | symbol, TManualDtoPropertyMetadata> | undefined);

	registry.set(propertyKey, metadata);
	Reflect.defineMetadata?.(MANUAL_PROPERTY_METADATA_DTO_UTILITY_CONSTANT.KEY, registry, target);
}
