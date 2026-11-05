import type { TApiControllerGetListQueryRelationScalarPath } from "./relation/scalar.type";

/**
 * A key a typed filter may name: a direct scalar, or a scalar reached through relations within the hop limit.
 */
export type TApiControllerGetListQueryFilterPath<E> = TApiControllerGetListQueryRelationScalarPath<E>;
