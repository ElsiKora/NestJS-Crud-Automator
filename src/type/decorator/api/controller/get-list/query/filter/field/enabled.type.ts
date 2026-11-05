import type { EApiControllerGetListQueryFilterMissingBehavior } from "@enum/decorator/api";
import type { TNonEmptyReadonlyArray } from "@type/utility";

import type { TApiControllerGetListQueryFilterCondition } from "../condition.type";
import type { TApiControllerGetListQueryFilterOperationForValue } from "../operation-for-value.type";

export type TApiControllerGetListQueryFilterFieldEnabled<TValue> = {
	/** Most values a membership operator of this field takes, from 1 to 100; the global limit of 100 when left out. Required on a filter that crosses a relation with EXISTS. */
	maxValues?: number;
} & (
	| {
			allowedOperations: TNonEmptyReadonlyArray<TApiControllerGetListQueryFilterOperationForValue<TValue>>;
			defaultCondition: TApiControllerGetListQueryFilterCondition<TValue, TApiControllerGetListQueryFilterOperationForValue<TValue>>;
			isEnabled: true;
			missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.USE_DEFAULT;
	  }
	| {
			allowedOperations: TNonEmptyReadonlyArray<TApiControllerGetListQueryFilterOperationForValue<TValue>>;
			defaultCondition?: never;
			isEnabled: true;
			missingBehavior?: EApiControllerGetListQueryFilterMissingBehavior.OMIT | EApiControllerGetListQueryFilterMissingBehavior.REJECT;
	  }
);
