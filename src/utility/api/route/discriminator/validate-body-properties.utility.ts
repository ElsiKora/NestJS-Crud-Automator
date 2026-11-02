import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";
import type { TManualDtoPropertyMetadata } from "@type/utility/dto/manual-property-metadata.type";

import { GetManualDtoPropertyMetadata } from "@utility/dto/manual/property-metadata/get.utility";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Refuses a discriminated request body that removes the discriminator while a variant requires it, because every body would then answer 400.
 * The requirement is read from the `@ApiProperty*` metadata of the variant, so a variant that requires the property only through raw class-validator decorators is not detected.
 * @param {TApiRouteDiscriminatedDtoProperties} properties - Route-level discriminated DTO config of a request body.
 * @param {string} context - Error message context.
 * @returns {void}
 */
export function ApiRouteValidateDiscriminatedBodyProperties(properties: TApiRouteDiscriminatedDtoProperties, context: string): void {
	const propertyName: string = properties.discriminator.propertyName;

	// A missing property is not validated under skipMissingProperties, so the variant still accepts the body.
	if (properties.discriminator.shouldKeepDiscriminatorProperty !== false || properties.validatorOptions?.skipMissingProperties) {
		return;
	}

	for (const variant of properties.type) {
		const metadata: TManualDtoPropertyMetadata | undefined = GetManualDtoPropertyMetadata(variant.prototype as object).get(propertyName);

		if (metadata?.properties.isRequired && metadata.properties.isResponse !== true) {
			throw ErrorException(`${context} discriminator config error: DTO ${variant.name || "Anonymous"} requires discriminator property '${propertyName}', but 'shouldKeepDiscriminatorProperty: false' removes it before validation, so every body would answer 400. Leave the option out, or make the property optional`);
		}
	}
}
