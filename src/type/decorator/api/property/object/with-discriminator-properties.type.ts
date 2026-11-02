import type { TApiPropertyBaseProperties, TApiPropertyBaseResponseArrayProperties } from "@type/decorator/api/property/base";
import type { TApiPropertyObjectDeclaredClass } from "@type/decorator/api/property/object/declared-class.type";
import type { TSwaggerReferenceObject, TSwaggerSchemaObject } from "@type/swagger";
import type { ClassConstructor } from "class-transformer";

export type TApiPropertyObjectWithDiscriminatorProperties = {
	additionalProperties?: boolean | TSwaggerReferenceObject | TSwaggerSchemaObject;
	discriminator: TTypeDiscriminator;
	shouldValidateNested?: boolean;
	type: Array<TApiPropertyObjectDeclaredClass>;
} & (TApiPropertyBaseProperties | TApiPropertyBaseResponseArrayProperties);

export type TTypeDiscriminator = {
	mapping: Record<string, ClassConstructor<unknown>>;
	propertyName: string;
	shouldKeepDiscriminatorProperty?: boolean;
};
