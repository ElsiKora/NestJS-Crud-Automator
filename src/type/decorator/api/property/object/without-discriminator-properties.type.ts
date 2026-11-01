import type { Type } from "@nestjs/common";
import type { TApiPropertyBaseProperties } from "@type/decorator/api/property/base";
import type { TTypeDiscriminator } from "@type/decorator/api/property/object/with-discriminator-properties.type";
import type { TSwaggerReferenceObject, TSwaggerSchemaObject } from "@type/swagger";

export type TApiPropertyObjectWithoutDiscriminatorProperties = {
	additionalProperties?: boolean | TSwaggerReferenceObject | TSwaggerSchemaObject;
	discriminator?: TTypeDiscriminator;
	shouldValidateNested?: boolean;
	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	type: [Function] | Function | Type<unknown> | undefined;
} & TApiPropertyBaseProperties;
