import type { TApiFunctionDeleteCriteria } from "@type/decorator/api/function";

import type { SubscriberResultEntity } from "../entity.class";

export type TSubscriberResultDeleteInput = TApiFunctionDeleteCriteria<SubscriberResultEntity> & {
	readonly amount: string;
};
