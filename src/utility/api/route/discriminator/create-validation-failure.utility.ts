import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";

import { ValidationError } from "class-validator";

/**
 * Creates class-validator-shaped validation failure for route-level discriminator selection failures.
 * The failure intentionally has no `value` and its message never echoes the rejected payload.
 * @param {TApiRouteDiscriminatedDtoProperties} properties - Route-level discriminated DTO config.
 * @param {unknown} payload - Request body payload.
 * @returns {ValidationError} Class-validator-compatible validation failure.
 */
export function ApiRouteCreateDiscriminatedDtoValidationFailure(properties: TApiRouteDiscriminatedDtoProperties, payload: unknown): ValidationError {
	const discriminatorPropertyName: string = properties.discriminator.propertyName;

	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return Object.assign(new ValidationError(), {
			children: [],
			constraints: {
				mustMatchDiscriminatorMapping: "body must be an object",
			},
			property: "body",
		});
	}

	if (!(discriminatorPropertyName in payload)) {
		return Object.assign(new ValidationError(), {
			children: [],
			constraints: {
				mustMatchDiscriminatorMapping: `${discriminatorPropertyName} is missing required discriminator field '${discriminatorPropertyName}'`,
			},
			property: discriminatorPropertyName,
		});
	}

	const allowedValuesDescription: string = Object.keys(properties.discriminator.mapping)
		.map((value: string): string => {
			return `'${value}'`;
		})
		.join(", ");

	return Object.assign(new ValidationError(), {
		children: [],
		constraints: {
			mustMatchDiscriminatorMapping: `${discriminatorPropertyName} has invalid discriminator value. must be one of: ${allowedValuesDescription}`,
		},
		property: discriminatorPropertyName,
	});
}
