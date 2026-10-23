import type { Type } from "@nestjs/common";
import type { TTypeDiscriminator } from "@type/decorator/api/property";
import type { ClassTransformOptions } from "class-transformer";
import type { ValidationError, ValidatorOptions } from "class-validator";

export type TApiRouteDiscriminatedDtoProperties = {
	discriminator: TTypeDiscriminator;
	/**
	 * Builds the error thrown for an invalid request body, mirroring Nest `ValidationPipe` `exceptionFactory`; it may be sync or async.
	 * Receives one synthetic `mustMatchDiscriminatorMapping` error without `value` when the discriminator cannot be resolved,
	 * or the native class-validator errors of the selected variant. Request body only.
	 */
	exceptionFactory?: (errors: Array<ValidationError>) => unknown;
	transformOptions?: ClassTransformOptions;
	type: Array<Type<unknown>>;
	validatorOptions?: ValidatorOptions;
};
