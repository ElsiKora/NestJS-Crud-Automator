import type { TApiFunctionGetManyProperties } from "@type/decorator/api/function";

import type { SubscriberResultEntity } from "../entity.class";

export type TSubscriberResultGetManyInput = TApiFunctionGetManyProperties<SubscriberResultEntity> & {
	readonly take: 10;
};
