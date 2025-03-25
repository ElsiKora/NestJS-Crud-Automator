import type { Type } from "@nestjs/common";
import type { ReferenceObject, SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

import type { TApiPropertyBaseProperties } from "../base";

export type TApiPropertyObjectDynamicWithDiscriminatorProperties = {
	additionalProperties?: boolean | ReferenceObject | SchemaObject;
	discriminator: TTypeDynamicDiscriminator;
	generatedDTOs: Record<string, Type<unknown>>;
	isDynamicallyGenerated: boolean;
	shouldValidateNested?: boolean;
	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	type: Array<Function> | Array<Type<unknown>>;
} & TApiPropertyBaseProperties;

export type TTypeDynamicDiscriminator = {
	mapping: Record<string, string>;
	propertyName: string;
	shouldKeepDiscriminatorProperty?: boolean;
};
