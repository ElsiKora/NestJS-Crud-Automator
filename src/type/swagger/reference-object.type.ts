import type { TSwaggerComponentSchema } from "./component-schema.type";

export type TSwaggerReferenceObject = Extract<TSwaggerComponentSchema, { $ref: string }>;
