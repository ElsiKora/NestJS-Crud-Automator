import type { TManualDtoPropertyMetadata } from "@type/utility/dto/manual-property-metadata.type";

import { MANUAL_PROPERTY_METADATA_DTO_UTILITY_CONSTANT } from "@constant/utility/dto/manual-property-metadata.constant";

/**
 * Returns merged manual DTO decorator metadata for the supplied prototype, including inherited
 * properties with child definitions overriding parent ones.
 * @param {object} target - DTO prototype.
 * @returns {Map<string | symbol, TManualDtoPropertyMetadata>} Merged property metadata map.
 */
export function GetManualDtoPropertyMetadata(target: object): Map<string | symbol, TManualDtoPropertyMetadata> {
	const prototypes: Array<object> = [];
	let current: null | object = target;

	while (current && current !== Object.prototype) {
		prototypes.unshift(current);
		current = Object.getPrototypeOf(current) as null | object;
	}

	const merged: Map<string | symbol, TManualDtoPropertyMetadata> = new Map<string | symbol, TManualDtoPropertyMetadata>();

	for (const prototype of prototypes) {
		const registry: Map<string | symbol, TManualDtoPropertyMetadata> | undefined = Reflect.getMetadata?.(MANUAL_PROPERTY_METADATA_DTO_UTILITY_CONSTANT.KEY, prototype) as Map<string | symbol, TManualDtoPropertyMetadata> | undefined;

		if (!registry) {
			continue;
		}

		for (const [propertyKey, metadata] of registry.entries()) {
			merged.set(propertyKey, metadata);
		}
	}

	return merged;
}
