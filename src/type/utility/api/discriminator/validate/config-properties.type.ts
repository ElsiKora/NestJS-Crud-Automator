import type { Type } from "@nestjs/common";
import type { TTypeDiscriminator } from "@type/decorator/api/property";

export type TApiDiscriminatorValidateConfigProperties = {
	context: string;
	discriminator: TTypeDiscriminator;
	shouldRequireDeclaredDiscriminatorProperty?: boolean;
	variants: Array<Type<unknown>>;
};
