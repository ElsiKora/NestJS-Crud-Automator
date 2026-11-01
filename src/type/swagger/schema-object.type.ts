import type { TSwaggerComponentSchema } from "./component-schema.type";
import type { TSwaggerReferenceObject } from "./reference-object.type";

export type TSwaggerSchemaObject = Exclude<TSwaggerComponentSchema, TSwaggerReferenceObject>;
