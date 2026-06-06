import type { TApiFunctionGetListProperties } from "@type/decorator/api/function";

import type { SubscriberResultEntity } from "../entity.class";

export type TSubscriberResultGetListInput = TApiFunctionGetListProperties<SubscriberResultEntity> & {
	readonly take: 10;
};
