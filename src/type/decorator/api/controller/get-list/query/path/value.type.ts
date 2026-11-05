import type { TApiControllerGetListQueryRelationTarget } from "./relation/target.type";

/**
 * The type of the value a filter path names.
 */
export type TApiControllerGetListQueryFilterPathValue<E, P extends string> = P extends `${infer R}.${infer N}` ? (R extends keyof E ? TApiControllerGetListQueryFilterPathValue<TApiControllerGetListQueryRelationTarget<E[R]>, N> : never) : P extends keyof E & string ? E[P] : never;
