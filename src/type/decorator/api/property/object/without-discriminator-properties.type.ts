import type { TApiPropertyBaseProperties, TApiPropertyBaseResponseArrayProperties } from "@type/decorator/api/property/base";
import type { TApiPropertyObjectDeclaredClass } from "@type/decorator/api/property/object/declared-class.type";
import type { TTypeDiscriminator } from "@type/decorator/api/property/object/with-discriminator-properties.type";
import type { TSwaggerReferenceObject, TSwaggerSchemaObject } from "@type/swagger";

export type TApiPropertyObjectWithoutDiscriminatorProperties = {
	additionalProperties?: boolean | TSwaggerReferenceObject | TSwaggerSchemaObject;
	discriminator?: TTypeDiscriminator;
} & (
	| {
			shouldValidateNested?: boolean;
			type: [TApiPropertyObjectDeclaredClass] | TApiPropertyObjectDeclaredClass;
	  }
	| {
			shouldValidateNested?: false;
			type: ObjectConstructor | undefined;
	  }
) &
	(TApiPropertyBaseProperties | TApiPropertyBaseResponseArrayProperties);
