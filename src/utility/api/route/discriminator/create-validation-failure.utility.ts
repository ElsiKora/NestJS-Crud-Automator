import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";
import type { ValidationError } from "class-validator";

/**
 * Creates class-validator-shaped validation failure for route-level discriminator selection failures.
 * @param {TApiRouteDiscriminatedDtoProperties} properties - Route-level discriminated DTO config.
 * @param {unknown} payload - Request body payload.
 * @returns {ValidationError} Class-validator-compatible validation failure.
 */
export function ApiRouteCreateDiscriminatedDtoValidationFailure(properties: TApiRouteDiscriminatedDtoProperties, payload: unknown): ValidationError {
	const discriminatorPropertyName: string = properties.discriminator.propertyName;

	const allowedValuesDescription: string = Object.keys(properties.discriminator.mapping)
		.map((value: string): string => {
			return `'${value}'`;
		})
		.join(", ");

	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return {
			constraints: {
				mustMatchDiscriminatorMapping: "body must be an object",
			},
			property: "body",
			value: payload,
		};
	}

	const payloadAsRecord: Record<string, unknown> = payload as Record<string, unknown>;

	if (!(discriminatorPropertyName in payloadAsRecord)) {
		return {
			constraints: {
				mustMatchDiscriminatorMapping: `${discriminatorPropertyName} is missing required discriminator field '${discriminatorPropertyName}'`,
			},
			property: discriminatorPropertyName,
			value: undefined,
		};
	}

	const discriminatorValue: unknown = payloadAsRecord[discriminatorPropertyName];

	return {
		constraints: {
			mustMatchDiscriminatorMapping: `${discriminatorPropertyName} has invalid discriminator value '${String(discriminatorValue)}'. must be one of: ${allowedValuesDescription}`,
		},
		property: discriminatorPropertyName,
		value: discriminatorValue,
	};
}
