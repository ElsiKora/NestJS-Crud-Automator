import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteResponseSerializationProperties } from "@interface/decorator/api/route";
import type { Type } from "@nestjs/common";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";

import { HttpStatus } from "@nestjs/common";
import { ApiRouteSerializeResponse } from "@utility/api/route/response/serialize.utility";

/**
 * Serializes a generated route response with the route DTO and serialization settings.
 * @template E - Entity type owned by the route.
 * @template R - Response value type.
 * @param {TApiControllerPropertiesRoute<E, EApiRouteType>} routeConfig - Route configuration containing response serialization settings.
 * @param {Type<unknown> | undefined} dto - DTO type used for response serialization.
 * @param {R} response - Response value to serialize.
 * @returns {R} Serialized response value.
 */
export function ApiControllerSerializeRouteResponse<E extends IApiBaseEntity, R>(routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType>, dto: Type<unknown> | undefined, response: R): R {
	const serialization: IApiRouteResponseSerializationProperties = routeConfig.response?.serialization ?? {
		isEnabled: true,
	};

	return ApiRouteSerializeResponse<E, R>(
		{
			response: {
				serialization,
				status: HttpStatus.OK,
				type: dto,
			},
		},
		response,
	);
}
