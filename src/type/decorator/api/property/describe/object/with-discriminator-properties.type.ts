import type { EApiPropertyDescribeType } from "@enum/decorator/api";
import type { Type } from "@nestjs/common";
import type { ReferenceObject, SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "@type/decorator/api/property/describe/array";
import type { TApiPropertyDescribeBaseProperties } from "@type/decorator/api/property/describe/base-properties.type";
import type { TTypeDiscriminator } from "@type/decorator/api/property/object";

export type TApiPropertyDescribeObjectWithDiscriminatorProperties = {
	additionalProperties?: boolean | ReferenceObject | SchemaObject;
	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	dataType: Array<Function> | Array<Type<unknown>>;
	description: string;
	discriminator: TTypeDiscriminator;
	shouldValidateNested?: boolean;
	type: EApiPropertyDescribeType.OBJECT;
} & (TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties) &
	TApiPropertyDescribeBaseProperties;
