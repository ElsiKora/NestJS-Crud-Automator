import type { OpenAPIObject } from "@nestjs/swagger";

export type TSwaggerSecurityRequirementObject = NonNullable<OpenAPIObject["security"]>[number];
