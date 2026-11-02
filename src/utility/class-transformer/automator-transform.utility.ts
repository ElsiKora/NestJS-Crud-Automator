import type { TransformFnParams, TransformOptions } from "class-transformer";

import { AUTOMATOR_TRANSFORM_DTO_CONSTANT } from "@constant/dto/automator-transform.constant";
import { Transform } from "class-transformer";

/**
 * Registers a `@Transform` that an Automator property decorator owns, and marks its function as one.
 * A generated copy of a manual DTO replays the property decorators, which bring their own transforms back, so it copies only the transforms not marked here.
 * @param {(parameters: TransformFnParams) => unknown} transformFunction - Transform function.
 * @param {TransformOptions} [options] - Transform options.
 * @returns {PropertyDecorator} The `@Transform` decorator.
 */
export function ClassTransformerAutomatorTransform(transformFunction: (parameters: TransformFnParams) => unknown, options?: TransformOptions): PropertyDecorator {
	Reflect.defineMetadata(AUTOMATOR_TRANSFORM_DTO_CONSTANT.METADATA_KEY, true, transformFunction);

	return Transform(transformFunction, options);
}
