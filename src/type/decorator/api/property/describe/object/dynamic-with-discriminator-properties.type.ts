import type { EApiPropertyDescribeType } from "@enum/decorator/api";
import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "@type/decorator/api/property/describe/array";
import type { TApiPropertyDescribeBaseProperties } from "@type/decorator/api/property/describe/base-properties.type";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property/describe/properties.type";
import type { TTypeDynamicDiscriminator } from "@type/decorator/api/property/object";
import type { TSwaggerReferenceObject, TSwaggerSchemaObject } from "@type/swagger";

export type TApiPropertyDescribeObjectDynamicWithDiscriminatorProperties = {
	additionalProperties?: boolean | TSwaggerReferenceObject | TSwaggerSchemaObject;
	dataType: Record<string, Record<string, TApiPropertyDescribeProperties>>;
	description: string;
	discriminator: TTypeDynamicDiscriminator;
	isDynamicallyGenerated: boolean;
	shouldValidateNested?: boolean;
	type: EApiPropertyDescribeType.OBJECT;
} & (TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties) &
	TApiPropertyDescribeBaseProperties;
