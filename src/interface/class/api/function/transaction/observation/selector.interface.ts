import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionTransactionTraceType } from "@type/class/api/function/transaction";

export interface IApiFunctionTransactionObservationSelector {
	entity: new (...arguments_: Array<unknown>) => IApiBaseEntity;
	functionType: TApiFunctionTransactionTraceType;
	methodName: string;
}
