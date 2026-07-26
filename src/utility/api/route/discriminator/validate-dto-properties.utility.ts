import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";

import { ApiDiscriminatorValidateConfig } from "@utility/api/discriminator-validate-config.utility";

/**
 * Validates that route-level discriminator config and variant DTO classes are consistent.
 * @param {TApiRouteDiscriminatedDtoProperties} properties - Route-level discriminated DTO config.
 * @param {string} context - Error message context.
 * @returns {void}
 */
export function ApiRouteValidateDiscriminatedDtoProperties(properties: TApiRouteDiscriminatedDtoProperties, context: string): void {
	ApiDiscriminatorValidateConfig({
		context,
		discriminator: properties.discriminator,
		shouldRequireDeclaredDiscriminatorProperty: true,
		variants: properties.type,
	});
}
