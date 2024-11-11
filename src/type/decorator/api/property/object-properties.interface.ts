import type { Type } from "@nestjs/common";
import type { ReferenceObject, SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import {TApiPropertyBaseProperties} from "./base-properties.type";

export type TApiPropertyObjectProperties<T> = TApiPropertyBaseProperties<T> & {
	additionalProperties?: boolean | ReferenceObject | SchemaObject;
	default?: number | string;
	nested?: boolean;
	nullable?: boolean;
	type?: [Function] | Function | Record<string, any> | Type<unknown> | undefined;
}
