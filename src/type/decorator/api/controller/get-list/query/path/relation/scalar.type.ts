import type { TApiControllerGetListQueryScalarValue } from "../scalar-value.type";

import type { TApiControllerGetListQueryRelationHops } from "./hops.type";
import type { TApiControllerGetListQueryRelationTarget } from "./target.type";

/**
 * Every scalar reachable from an entity through relations, to-one or to-many, within the hops left. Direct scalars are the paths of no hop.
 */
export type TApiControllerGetListQueryRelationScalarPath<E, THops extends ReadonlyArray<unknown> = TApiControllerGetListQueryRelationHops> = {
	[K in keyof E & string]: NonNullable<E[K]> extends TApiControllerGetListQueryScalarValue ? K : TApiControllerGetListQueryRelationTarget<E[K]> extends infer R ? ([R] extends [never] ? never : R extends object ? (THops extends readonly [unknown, ...infer TLeft] ? `${K}.${TApiControllerGetListQueryRelationScalarPath<R, TLeft>}` : never) : never) : never;
}[keyof E & string];
