import type { ReferenceObject, SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

import type { EApiPropertyDescribeType } from "../../../../../../enum";
import type { TTypeDynamicDiscriminator } from "../../object";
import type { TApiPropertyDescribeArrayOptionalProperties, TApiPropertyDescribeArrayRequiredProperties } from "../array";
import type { TApiPropertyDescribeBaseProperties } from "../base-properties.type";
import type { TApiPropertyDescribeProperties } from "../properties.type";

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
