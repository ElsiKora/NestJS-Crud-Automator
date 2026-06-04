import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";

/**
 * Checks whether a value is a route-level discriminated DTO config.
 * @param {unknown} value - Value to inspect.
 * @returns {boolean} Whether the value is a discriminated DTO config.
 */
export function ApiRouteIsDiscriminatedDtoProperties(value: unknown): value is TApiRouteDiscriminatedDtoProperties {
	return typeof value === "object" && value !== null && !Array.isArray(value) && "type" in value && Array.isArray((value as { type?: unknown }).type) && "discriminator" in value;
}
