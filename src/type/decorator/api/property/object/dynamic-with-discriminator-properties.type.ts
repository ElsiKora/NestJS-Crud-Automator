import type { Type } from "@nestjs/common";
import type { TApiPropertyBaseProperties, TApiPropertyBaseResponseArrayProperties } from "@type/decorator/api/property/base";
import type { TApiPropertyObjectDeclaredClass } from "@type/decorator/api/property/object/declared-class.type";
import type { TSwaggerReferenceObject, TSwaggerSchemaObject } from "@type/swagger";

export type TApiPropertyObjectDynamicWithDiscriminatorProperties = {
	additionalProperties?: boolean | TSwaggerReferenceObject | TSwaggerSchemaObject;
	discriminator: TTypeDynamicDiscriminator;
	generatedDTOs: Record<string, Type<unknown>>;
	isDynamicallyGenerated: boolean;
	shouldValidateNested?: boolean;
	type: Array<TApiPropertyObjectDeclaredClass>;
} & (TApiPropertyBaseProperties | TApiPropertyBaseResponseArrayProperties);

export type TTypeDynamicDiscriminator = {
	mapping: Record<string, string>;
	propertyName: string;
	/**
	 * Left out or `true` keeps the property. `false` removes it, and on a nested `ApiPropertyObject` request property it fails at decoration.
	 */
	shouldKeepDiscriminatorProperty?: boolean;
};
