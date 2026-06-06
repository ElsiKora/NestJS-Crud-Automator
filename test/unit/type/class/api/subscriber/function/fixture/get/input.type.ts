import type { TApiFunctionGetProperties } from "@type/decorator/api/function";

import type { SubscriberResultEntity } from "../entity.class";

export type TSubscriberResultGetInput = TApiFunctionGetProperties<SubscriberResultEntity> & {
	readonly where: {
		readonly amount: string;
	};
};
