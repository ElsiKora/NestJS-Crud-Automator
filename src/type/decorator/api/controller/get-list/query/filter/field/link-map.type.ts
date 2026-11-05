import type { TApiControllerGetListQueryFieldDisabled } from "../../field";
import type { TApiControllerGetListQueryFilterPathValue, TApiControllerGetListQueryRelationHops, TApiControllerGetListQueryRelationPathOwner, TApiControllerGetListQueryRelationScalarPath } from "../../path";

import type { TApiControllerGetListQueryFilterFieldRelation } from "./relation.type";

/**
 * The fields of a link, one key per path on its target. Each entry has the shape of a filter field that crosses a relation.
 */
export type TApiControllerGetListQueryFilterLinkFields<TTarget> = {
	[P in TApiControllerGetListQueryRelationScalarPath<TTarget, TLinkHops>]?: TApiControllerGetListQueryFieldDisabled | TApiControllerGetListQueryFilterFieldRelation<TApiControllerGetListQueryFilterPathValue<TTarget, P>, TApiControllerGetListQueryRelationPathOwner<TTarget, P>>;
};

// A link entity crosses two relations, so a path on its target has that many fewer to cross.
type TLinkHops = TApiControllerGetListQueryRelationHops extends readonly [unknown, unknown, ...infer TLeft] ? TLeft : never;
