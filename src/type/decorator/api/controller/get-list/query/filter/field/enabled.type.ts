import type { EApiControllerGetListQueryFilterMissingBehavior } from "@enum/decorator/api";
import type { TNonEmptyReadonlyArray } from "@type/utility";

import type { TApiControllerGetListQueryFilterCondition } from "../condition.type";
import type { TApiControllerGetListQueryFilterOperationForValue } from "../operation-for-value.type";

export type TApiControllerGetListQueryFilterFieldEnabled<TValue> =
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
	  };
