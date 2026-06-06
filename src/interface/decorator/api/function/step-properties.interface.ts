import type { EApiFunctionTransactionMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

export interface IApiFunctionStepProperties<E extends IApiBaseEntity> {
	entity: new (...arguments_: Array<unknown>) => E;
	transaction?: {
		mode: EApiFunctionTransactionMode;
	};
}
