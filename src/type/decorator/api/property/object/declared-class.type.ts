import type { Type } from "@nestjs/common";

/**
 * A class that a nested value is validated against. `Object` declares none: it has statics that no class has, so it does not fit,
 * and a free-form value goes through `type: Object` on its own, without `shouldValidateNested`.
 */
// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
export type TApiPropertyObjectDeclaredClass = { getOwnPropertyNames?: never } & (Function | Type<unknown>);
