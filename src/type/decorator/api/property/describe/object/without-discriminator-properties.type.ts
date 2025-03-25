import type { Type } from "@nestjs/common";
import type { ReferenceObject, SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

import type { EApiPropertyDescribeType } from "../../../../../../enum";
import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "../array";
import type { TApiPropertyDescribeBaseProperties } from "../base-properties.type";

export type TApiPropertyDescribeObjectWithoutDiscriminatorProperties = {
	additionalProperties?: boolean | ReferenceObject | SchemaObject;
	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	dataType: [Function] | Function | Type<unknown> | undefined;
	description: string;
	shouldValidateNested?: boolean;
	type: EApiPropertyDescribeType.OBJECT;
} & (TApiPropertyDescribeArrayOptionalProperties | TApiPropertyDescribeArrayRequiredProperties) &
	TApiPropertyDescribeBaseProperties;
