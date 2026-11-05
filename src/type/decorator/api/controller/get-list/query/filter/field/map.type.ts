import type { TApiControllerGetListQueryFieldDisabled } from "../../field";
import type { TApiControllerGetListQueryFilterPath, TApiControllerGetListQueryFilterPathValue, TApiControllerGetListQueryRelationPathOwner } from "../../path";

import type { TApiControllerGetListQueryFilterFieldRelation } from "./relation.type";
import type { TApiControllerGetListQueryFilterField } from "./type";

/**
 * The fields of a typed filter, one key per path. A key that crosses a relation may also hold fixed conditions on the related rows.
 */
export type TApiControllerGetListQueryFilterFields<E> = {
	[P in TApiControllerGetListQueryFilterPath<E>]?: P extends `${string}.${string}` ? TApiControllerGetListQueryFieldDisabled | TApiControllerGetListQueryFilterFieldRelation<TApiControllerGetListQueryFilterPathValue<E, P>, TApiControllerGetListQueryRelationPathOwner<E, P>> : TApiControllerGetListQueryFilterField<TApiControllerGetListQueryFilterPathValue<E, P>>;
};
