import type { TApiControllerGetListQueryFilterPath } from "./filter.type";

export type TApiControllerGetListQueryFilterPathValue<E, P extends TApiControllerGetListQueryFilterPath<E>> = P extends `${infer R}.${infer N}` ? (R extends keyof E ? (N extends keyof NonNullable<E[R]> & string ? NonNullable<E[R]>[N] : never) : never) : P extends keyof E & string ? E[P] : never;
