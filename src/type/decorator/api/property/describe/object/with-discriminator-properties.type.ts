import type { Type } from "@nestjs/common";
import type { ReferenceObject, SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

import type { EApiPropertyDescribeType } from "../../../../../../enum";
import type { TTypeDiscriminator } from "../../object";
import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "../array";
import type { TApiPropertyDescribeBaseProperties } from "../base-properties.type";

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
