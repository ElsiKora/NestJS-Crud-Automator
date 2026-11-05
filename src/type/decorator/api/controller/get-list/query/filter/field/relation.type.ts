import type { EFilterOperation } from "@enum/filter";

import type { TApiControllerGetListQueryDirectScalarPath, TApiControllerGetListQueryScalarValue } from "../../path";
import type { TApiControllerGetListQueryFilterCondition } from "../condition.type";
import type { TApiControllerGetListQueryFilterOperationForValue } from "../operation-for-value.type";

import type { TApiControllerGetListQueryFilterFieldEnabled } from "./enabled.type";

/**
 * An enabled filter field whose key crosses a relation.
 */
export type TApiControllerGetListQueryFilterFieldRelation<TValue, TOwner> = {
	relationConditions?: ReadonlyArray<TApiControllerGetListQueryFilterRelationCondition<TOwner>>;
} & TApiControllerGetListQueryFilterFieldEnabled<TValue>;

/**
 * A fixed condition of a relation filter: on the last entity of the path, or, with `relation`, on the row of the hop it names.
 * Not client-visible: the plan binds it inside the same subquery as the client's value.
 */
export type TApiControllerGetListQueryFilterRelationCondition<TOwner> =
	| {
			[F in TApiControllerGetListQueryDirectScalarPath<TOwner>]: { field: F; relation?: never } & TApiControllerGetListQueryFilterCondition<TOwner[F], TApiControllerGetListQueryFilterOperationForValue<TOwner[F]>>;
	  }[TApiControllerGetListQueryDirectScalarPath<TOwner>]
	| ({ field: string; relation: string } & TApiControllerGetListQueryFilterCondition<TApiControllerGetListQueryScalarValue, `${EFilterOperation}`>);
