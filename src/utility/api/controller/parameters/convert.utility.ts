import type { Type } from "@nestjs/common";
import type { ClassTransformOptions } from "class-transformer";

import { plainToInstance } from "class-transformer";

/**
 * Converts path values to an instance of a DTO.
 * @param {Type<unknown>} dto - DTO class.
 * @param {object} parameters - Path values under their path parameter names.
 * @param {ClassTransformOptions} [options] - Conversion options.
 * @returns {object} The DTO instance.
 */
export function ApiControllerParametersConvert(dto: Type<unknown>, parameters: object, options?: ClassTransformOptions): object {
	const instance: unknown = plainToInstance(dto, parameters, options);

	return typeof instance === "object" && instance !== null ? instance : {};
}
