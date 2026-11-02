import type { EApiPropertyDescribeType } from "@enum/decorator/api";
import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "@type/decorator/api/property/describe/array";
import type { TApiPropertyDescribeBaseProperties } from "@type/decorator/api/property/describe/base-properties.type";
import type { TApiPropertyObjectDeclaredClass } from "@type/decorator/api/property/object";
import type { TSwaggerReferenceObject, TSwaggerSchemaObject } from "@type/swagger";

export type TApiPropertyDescribeObjectWithoutDiscriminatorProperties = {
	additionalProperties?: boolean | TSwaggerReferenceObject | TSwaggerSchemaObject;
	description: string;
	type: EApiPropertyDescribeType.OBJECT;
} & (
	| {
			dataType: [TApiPropertyObjectDeclaredClass] | TApiPropertyObjectDeclaredClass;
			shouldValidateNested?: boolean;
	  }
	| {
			dataType: ObjectConstructor | undefined;
			shouldValidateNested?: false;
	  }
) &
	(TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties) &
	TApiPropertyDescribeBaseProperties;
