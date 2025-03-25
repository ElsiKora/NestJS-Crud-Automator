import type { Type } from "@nestjs/common";
import type { ReferenceObject, SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import type { ClassConstructor } from "class-transformer";

import type { TApiPropertyBaseProperties } from "../base";

export type TApiPropertyObjectWithDiscriminatorProperties = {
	additionalProperties?: boolean | ReferenceObject | SchemaObject;
	discriminator: TTypeDiscriminator;
	shouldValidateNested?: boolean;
	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	type: Array<Function> | Array<Type<unknown>>;
} & TApiPropertyBaseProperties;

export type TTypeDiscriminator = {
	mapping: Record<string, ClassConstructor<any>>;
	propertyName: string;
	shouldKeepDiscriminatorProperty?: boolean;
};
