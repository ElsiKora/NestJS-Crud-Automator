import type { EApiFunctionSubscriberTransactionExpectation } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import type { IApiFunctionSubscriberFilter } from "./filter.interface";

export interface IApiFunctionSubscriberProperties<E extends IApiBaseEntity> {
	entity: new (...arguments_: Array<unknown>) => E;
	functions?: Array<IApiFunctionSubscriberFilter>;
	priority?: number;
	transaction?: {
		expectation: EApiFunctionSubscriberTransactionExpectation;
	};
}
