import type { Type } from "@nestjs/common";
import type { TTypeDiscriminator, TTypeDynamicDiscriminator } from "@type/decorator/api/property";

export interface IMustMatchOneOfSchemasDiscriminatorConfig {
	discriminator: TTypeDiscriminator | TTypeDynamicDiscriminator;
	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	schemas?: [Function] | Array<Function> | Array<Type<unknown>> | Record<string, Type<unknown>>;
}
