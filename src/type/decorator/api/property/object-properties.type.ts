import type { Type } from "@nestjs/common";
import type { ReferenceObject, SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

import type { TApiPropertyBaseProperties } from "./base";

export type TApiPropertyObjectProperties = {
	additionalProperties?: boolean | ReferenceObject | SchemaObject;
	shouldValidateNested?: boolean;
	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	type: [Function] | Function | Type<unknown> | undefined;
} & TApiPropertyBaseProperties;
