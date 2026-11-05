import type { FILTER_RELATION_CONSTANT } from "@constant/filter/relation.constant";

/**
 * The relations a typed filter path may still cross, as a tuple of the length the runtime limit names.
 */
export type TApiControllerGetListQueryRelationHops = TCount<(typeof FILTER_RELATION_CONSTANT)["MAXIMUM_HOPS"]>;

type TCount<TLength extends number, TItems extends ReadonlyArray<unknown> = []> = TItems["length"] extends TLength ? TItems : TCount<TLength, [...TItems, unknown]>;
