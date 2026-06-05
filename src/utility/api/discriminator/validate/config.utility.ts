import type { Type } from "@nestjs/common";
import type { TApiDiscriminatorValidateConfigProperties } from "@type/utility/api/discriminator";
import type { ClassConstructor } from "class-transformer";

import { DECORATORS } from "@nestjs/swagger/dist/constants.js";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Validates discriminator config against the DTO variants used to build Swagger and runtime transforms.
 * @param {TApiDiscriminatorValidateConfigProperties} properties - Discriminator validation properties.
 * @returns {void}
 */
export function ApiDiscriminatorValidateConfig(properties: TApiDiscriminatorValidateConfigProperties): void {
	const errors: Array<string> = [];

	if (!Array.isArray(properties.variants) || properties.variants.length === 0) {
		errors.push("type must contain at least one DTO class");
	}

	if (!properties.variants.every((variant: Type<unknown>): boolean => typeof variant === "function")) {
		errors.push("type must contain only DTO classes");
	}

	if (!properties.discriminator.propertyName || typeof properties.discriminator.propertyName !== "string") {
		errors.push("discriminator.propertyName must be a non-empty string");
	}

	if (!properties.discriminator.mapping || typeof properties.discriminator.mapping !== "object" || Object.keys(properties.discriminator.mapping).length === 0) {
		errors.push("discriminator.mapping must contain at least one variant");
	}

	const mappedVariants: Array<ClassConstructor<unknown>> = Object.values(properties.discriminator.mapping);
	const apiModelPropertiesMetadataKey: string = DECORATORS.API_MODEL_PROPERTIES;

	for (const [key, mappedType] of Object.entries(properties.discriminator.mapping)) {
		if (typeof mappedType !== "function") {
			errors.push(`discriminator.mapping.${key} must be a DTO class`);

			continue;
		}

		if (!properties.variants.includes(mappedType)) {
			errors.push(`discriminator.mapping.${key} references DTO ${mappedType.name || "Anonymous"} that is not listed in type`);
		}
	}

	for (const variant of properties.variants) {
		if (!mappedVariants.includes(variant)) {
			errors.push(`type contains DTO ${variant.name || "Anonymous"} that is not referenced by discriminator.mapping`);
		}

		if (properties.shouldRequireDeclaredDiscriminatorProperty && typeof variant === "function" && typeof properties.discriminator.propertyName === "string") {
			const variantPrototype: object = variant.prototype as object;
			const hasDiscriminatorPropertyMetadata: boolean = Boolean(Reflect.getMetadata(apiModelPropertiesMetadataKey, variantPrototype, properties.discriminator.propertyName));

			if (!hasDiscriminatorPropertyMetadata) {
				errors.push(`DTO ${variant.name || "Anonymous"} must declare discriminator property '${properties.discriminator.propertyName}'`);
			}
		}
	}

	if (errors.length > 0) {
		throw ErrorException(`${properties.context} discriminator config error: ${errors.join("\n")}`);
	}
}
