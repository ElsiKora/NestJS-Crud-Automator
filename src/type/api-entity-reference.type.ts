import type { Abstract } from "@nestjs/common";

// TypeScript refuses { foo: 1 }, { name: 1 } and an instance of a class without a name. It cannot refuse {}, an object-typed value or any function
export type TApiEntityReference = { name?: string } | Abstract<object>;
