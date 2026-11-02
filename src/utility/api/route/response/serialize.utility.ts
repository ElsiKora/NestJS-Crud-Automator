import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteMetadata } from "@interface/decorator/api";
import type { TApiRouteDiscriminatedDtoProperties } from "@type/decorator/api/route";
import type { ClassConstructor } from "class-transformer";

import { HttpStatus } from "@nestjs/common";
import { ApiRoutePrepareDiscriminatedDtoPayload, ApiRouteResolveDiscriminatedDto } from "@utility/api/route/discriminator";
import { ClassTransformerAttachWireNames } from "@utility/class-transformer/attach-wire-names.utility";
import { ClassTransformerSourceToExposed } from "@utility/class-transformer/source-to-exposed.utility";
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

		return serializeToWire(selectedDto, ApiRoutePrepareDiscriminatedDtoPayload(discriminatedResponseProperties, response));
	}

	return serializeToWire(metadata.response.type as ClassConstructor<R>, response);
}

/**
 * Builds the response DTO from a handler result and gives it its wire names, with or without `ClassSerializerInterceptor`.
 * The handler's property keys are the source. Plain-to-class runs `toClassOnly` and undirected transforms once, with `obj` the full handler result.
 * The `@Expose` names are applied afterwards by `toJSON`, without running a transform again, so `toPlainOnly` runs only where class-to-plain runs.
 * @template R - Response value type.
 * @param {ClassConstructor<R>} dto - Response DTO class.
 * @param {unknown} response - Handler result.
 * @returns {R} The DTO instance, or an array of them.
 * @private
 */
function serializeToWire<R>(dto: ClassConstructor<R>, response: unknown): R {
	const instance: R = plainToInstance(dto, ClassTransformerSourceToExposed(dto, response) as R, {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		excludeExtraneousValues: true,
		strategy: "excludeAll",
	});

	ClassTransformerAttachWireNames(instance);

	return instance;
}
