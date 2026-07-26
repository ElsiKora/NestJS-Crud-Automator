import type { EApiFunctionTransactionOwnerKind } from "@enum/decorator/api";
import type { TApiFunctionTransactionTraceType } from "@type/class/api/function/transaction/trace-type.type";

export interface IApiFunctionTransactionFunctionOwner {
	action?: string;
	entityName: string;
	functionType: TApiFunctionTransactionTraceType;
	kind: EApiFunctionTransactionOwnerKind.FUNCTION;
	methodName: string;
}
