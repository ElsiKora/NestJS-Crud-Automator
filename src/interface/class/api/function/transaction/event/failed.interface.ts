import type { EApiFunctionTransactionEventStatus } from "@enum/decorator/api";
import type { TApiFunctionTransactionTraceType } from "@type/class/api/function/transaction/trace-type.type";

export interface IApiFunctionTransactionFailedEvent {
	action?: string;
	entityName: string;
	error: unknown;
	functionType: TApiFunctionTransactionTraceType;
	methodName: string;
	sequence: number;
	status: EApiFunctionTransactionEventStatus.FAILED;
}
