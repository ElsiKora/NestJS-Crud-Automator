import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";

/**
 * Removes the discriminator property from a root DTO payload when the config requests it.
 * @param {TApiRouteDiscriminatedDtoProperties} properties - Route-level discriminated DTO config.
 * @param {unknown} payload - Payload selected by the discriminator.
 * @returns {unknown} Original or copied payload used for transformation/serialization.
 */
export function ApiRoutePrepareDiscriminatedDtoPayload(properties: TApiRouteDiscriminatedDtoProperties, payload: unknown): unknown {
	if (properties.discriminator.shouldKeepDiscriminatorProperty !== false || !payload || typeof payload !== "object" || Array.isArray(payload)) {
		return payload;
	}

	return Object.fromEntries(
		Object.entries(payload as Record<string, unknown>).filter(([key]: [string, unknown]): boolean => {
			return key !== properties.discriminator.propertyName;
		}),
	);
}
