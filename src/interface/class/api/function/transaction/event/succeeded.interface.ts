import type { EApiFunctionTransactionEventStatus } from "@enum/decorator/api";
import type { TApiFunctionTransactionTraceType } from "@type/class/api/function/transaction/trace-type.type";

export interface IApiFunctionTransactionSucceededEvent {
	action?: string;
	entityName: string;
	functionType: TApiFunctionTransactionTraceType;
	methodName: string;
	sequence: number;
	status: EApiFunctionTransactionEventStatus.SUCCEEDED;
}
