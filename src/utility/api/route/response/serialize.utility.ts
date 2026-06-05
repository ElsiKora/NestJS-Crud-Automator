import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteMetadata } from "@interface/decorator/api";
import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";
import type { ClassConstructor } from "class-transformer";

import { HttpStatus } from "@nestjs/common";
import { ApiRoutePrepareDiscriminatedDtoPayload, ApiRouteResolveDiscriminatedDto } from "@utility/api/route/discriminator";
import { ErrorException } from "@utility/error/exception.utility";
import { plainToInstance } from "class-transformer";

/**
 * Serializes a route response using the route metadata response DTO configuration.
 * @template E - Entity type represented by the route metadata.
 * @template R - Response value type.
 * @param {Pick<IApiRouteMetadata<E>, "response">} metadata - Route metadata containing response serialization settings.
 * @param {R} response - Response value to serialize.
 * @returns {R} Serialized response value.
 */
export function ApiRouteSerializeResponse<E extends IApiBaseEntity, R>(metadata: Pick<IApiRouteMetadata<E>, "response">, response: R): R {
	if (!metadata.response?.serialization?.isEnabled || !metadata.response.type || metadata.response.status === HttpStatus.NO_CONTENT) {
		return response;
	}

	if (Array.isArray(metadata.response.type)) {
		if (!metadata.response.discriminator) {
			throw ErrorException("ApiRouteSerializeResponse error: response.discriminator is required when response.type is an array");
		}

		const discriminatedResponseProperties: TApiRouteDiscriminatedDtoProperties = {
			discriminator: metadata.response.discriminator,
			type: metadata.response.type,
		};
		const selectedDto: ClassConstructor<R> = ApiRouteResolveDiscriminatedDto(discriminatedResponseProperties, response, "ApiRouteSerializeResponse") as ClassConstructor<R>;

		return plainToInstance(selectedDto, ApiRoutePrepareDiscriminatedDtoPayload(discriminatedResponseProperties, response), {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			excludeExtraneousValues: true,
			strategy: "excludeAll",
		});
	}

	return plainToInstance(metadata.response.type as ClassConstructor<R>, response, {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		excludeExtraneousValues: true,
		strategy: "excludeAll",
	});
}
