import type { EApiPropertyDescribeType } from "@enum/decorator/api";
import type { ReferenceObject, SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "@type/decorator/api/property/describe/array";
import type { TApiPropertyDescribeBaseProperties } from "@type/decorator/api/property/describe/base-properties.type";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property/describe/properties.type";
import type { TTypeDynamicDiscriminator } from "@type/decorator/api/property/object";

export type TApiPropertyDescribeObjectDynamicWithDiscriminatorProperties = {
	additionalProperties?: boolean | ReferenceObject | SchemaObject;
	dataType: Record<string, Record<string, TApiPropertyDescribeProperties>>;
	description: string;
	discriminator: TTypeDynamicDiscriminator;
	isDynamicallyGenerated: boolean;
	shouldValidateNested?: boolean;
	type: EApiPropertyDescribeType.OBJECT;
} & (TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties) &
	TApiPropertyDescribeBaseProperties;
