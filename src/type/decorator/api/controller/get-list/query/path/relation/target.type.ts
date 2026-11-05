import type { TApiControllerGetListQueryScalarValue } from "../scalar-value.type";

/**
 * The entity a relation property leads to, to-one or to-many, or `never` for a scalar or a list of scalars.
 */
export type TApiControllerGetListQueryRelationTarget<T> = NonNullable<T> extends TApiControllerGetListQueryScalarValue ? never : NonNullable<T> extends ReadonlyArray<infer I> ? (I extends TApiControllerGetListQueryScalarValue ? never : I extends object ? I : never) : NonNullable<T> extends object ? NonNullable<T> : never;
