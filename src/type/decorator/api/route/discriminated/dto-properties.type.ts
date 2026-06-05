import type { Type } from "@nestjs/common";
import type { TTypeDiscriminator } from "@type/decorator/api/property";
import type { ClassTransformOptions } from "class-transformer";
import type { ValidatorOptions } from "class-validator";

export type TApiRouteDiscriminatedDtoProperties = {
	discriminator: TTypeDiscriminator;
	transformOptions?: ClassTransformOptions;
	type: Array<Type<unknown>>;
	validatorOptions?: ValidatorOptions;
};
