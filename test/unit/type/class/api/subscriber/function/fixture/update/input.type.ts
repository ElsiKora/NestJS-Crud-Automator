import type { TApiFunctionUpdateProperties } from "@type/decorator/api/function";

import type { SubscriberResultEntity } from "../entity.class";

export type TSubscriberResultUpdateInput = TApiFunctionUpdateProperties<SubscriberResultEntity> & {
	readonly amount: string;
};
