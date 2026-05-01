import type { TManualDtoPropertyMetadata } from "@type/utility/dto/manual/property-metadata.type";

const MANUAL_DTO_PROPERTY_METADATA_KEY: string = "crud-automator:manual-dto-property-metadata";

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
		const registry: Map<string | symbol, TManualDtoPropertyMetadata> | undefined = Reflect.getMetadata?.(MANUAL_DTO_PROPERTY_METADATA_KEY, prototype) as Map<string | symbol, TManualDtoPropertyMetadata> | undefined;

		if (!registry) {
			continue;
		}

		for (const [propertyKey, metadata] of registry.entries()) {
			merged.set(propertyKey, metadata);
		}
	}

	return merged;
}

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

	const registry: Map<string | symbol, TManualDtoPropertyMetadata> = new Map<string | symbol, TManualDtoPropertyMetadata>((Reflect.getMetadata?.(MANUAL_DTO_PROPERTY_METADATA_KEY, target) as Map<string | symbol, TManualDtoPropertyMetadata> | undefined) ?? []);

	registry.set(propertyKey, metadata);
	Reflect.defineMetadata?.(MANUAL_DTO_PROPERTY_METADATA_KEY, registry, target);
}
