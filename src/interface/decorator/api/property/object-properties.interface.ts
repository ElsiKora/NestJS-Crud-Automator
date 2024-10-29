import type { IApiPropertyBaseProperties } from "./base-properties.interface";
import type { Type } from "@nestjs/common";
import type { ReferenceObject, SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

export interface IApiPropertyObjectProperties<T> extends IApiPropertyBaseProperties<T> {
	additionalProperties?: boolean | ReferenceObject | SchemaObject;
	default?: number | string;
	nested?: boolean;
	nullable?: boolean;
	type?: [Function] | Function | Record<string, any> | Type<unknown> | undefined;
}
