import type { TApiControllerGetListQueryRelationTarget } from "./target.type";

/**
 * The entity that holds the last segment of a path.
 */
export type TApiControllerGetListQueryRelationPathOwner<E, P extends string> = P extends `${infer R}.${infer N}` ? (R extends keyof E ? TApiControllerGetListQueryRelationPathOwner<TApiControllerGetListQueryRelationTarget<E[R]>, N> : never) : E;
