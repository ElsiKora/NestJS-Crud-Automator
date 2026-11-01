import type { OpenAPIObject } from "@nestjs/swagger";

export type TSwaggerComponentSchema = NonNullable<NonNullable<OpenAPIObject["components"]>["schemas"]>[string];
