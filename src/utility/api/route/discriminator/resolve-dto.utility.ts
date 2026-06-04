import type { Type } from "@nestjs/common";
import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";

import { ErrorException } from "@utility/error/exception.utility";

import { ApiRouteValidateDiscriminatedDtoProperties } from "./validate-dto-properties.utility";

/**
 * Selects the route DTO class for a payload using the configured discriminator mapping.
 * @param {TApiRouteDiscriminatedDtoProperties} properties - Route-level discriminated DTO config.
 * @param {unknown} payload - Request or response payload.
 * @param {string} context - Error message context.
 * @returns {Type<unknown>} Selected DTO class.
 */
export function ApiRouteResolveDiscriminatedDto(properties: TApiRouteDiscriminatedDtoProperties, payload: unknown, context: string): Type<unknown> {
	ApiRouteValidateDiscriminatedDtoProperties(properties, context);

	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		throw ErrorException(`${context} discriminator payload error: payload must be an object`);
	}

	const payloadAsRecord: Record<string, unknown> = payload as Record<string, unknown>;
	const discriminatorPropertyName: string = properties.discriminator.propertyName;

	if (!(discriminatorPropertyName in payloadAsRecord)) {
		throw ErrorException(`${context} discriminator payload error: missing required discriminator field '${discriminatorPropertyName}'`);
	}

	const discriminatorValue: unknown = payloadAsRecord[discriminatorPropertyName];

	if (typeof discriminatorValue !== "string" || discriminatorValue === "") {
		throw ErrorException(`${context} discriminator payload error: invalid discriminator value '${String(discriminatorValue)}' for field '${discriminatorPropertyName}'`);
	}

	const dto: Type<unknown> | undefined = properties.discriminator.mapping[discriminatorValue];

	if (!dto) {
		throw ErrorException(`${context} discriminator payload error: invalid discriminator value '${discriminatorValue}' for field '${discriminatorPropertyName}'`);
	}

	return dto;
}
