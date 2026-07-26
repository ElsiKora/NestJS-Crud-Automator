import type { TApiControllerGetListQueryScalarValue } from "./scalar-value.type";

export type TApiControllerGetListQueryToOneRelation<T> = NonNullable<T> extends ReadonlyArray<unknown> | TApiControllerGetListQueryScalarValue ? never : NonNullable<T> extends object ? NonNullable<T> : never;
