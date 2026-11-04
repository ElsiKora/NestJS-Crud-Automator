import type { Type } from "@nestjs/common";
import type { ClassTransformOptions } from "class-transformer";

import { EApiDtoType } from "@enum/decorator/api";
import { DtoRequestWireBindDto } from "@utility/dto/request-wire/bind/dto.utility";
import { plainToInstance } from "class-transformer";

/**
 * Converts path values to an instance of a DTO. Path values are text, so the DTO is bound as a PARAMETERS DTO first and its `ApiPropertyNumber` and `ApiPropertyBoolean` properties convert their canonical text.
 * @param {Type<unknown>} dto - DTO class.
 * @param {object} parameters - Path values under their path parameter names.
 * @param {ClassTransformOptions} [options] - Conversion options.
 * @returns {object} The DTO instance.
 */
export function ApiControllerParametersConvert(dto: Type<unknown>, parameters: object, options?: ClassTransformOptions): object {
	DtoRequestWireBindDto(dto, EApiDtoType.PARAMETERS, `the path values of a route read with ${dto.name}`);

	const instance: unknown = plainToInstance(dto, parameters, options);

	return typeof instance === "object" && instance !== null ? instance : {};
}
