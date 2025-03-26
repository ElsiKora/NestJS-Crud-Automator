import type { Type } from "@nestjs/common";
import type { ReferenceObject, SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import type { TApiPropertyBaseProperties } from "@type/decorator/api/property/base";
import type { TTypeDiscriminator } from "@type/decorator/api/property/object/with-discriminator-properties.type";

export type TApiPropertyObjectWithoutDiscriminatorProperties = {
	additionalProperties?: boolean | ReferenceObject | SchemaObject;
	discriminator?: TTypeDiscriminator;
	shouldValidateNested?: boolean;
	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	type: [Function] | Function | Type<unknown> | undefined;
} & TApiPropertyBaseProperties;
