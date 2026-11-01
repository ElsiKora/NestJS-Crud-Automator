import type { OpenAPIObject } from "@nestjs/swagger";

export type TSwaggerHeadersObject = NonNullable<NonNullable<OpenAPIObject["components"]>["headers"]>;
