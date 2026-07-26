import type { IApiSubscriberFunctionTransactionContextData } from "@interface/class/api/subscriber/function/transaction/context/data.interface";

export interface IApiSubscriberFunctionTransactionContext {
	readonly DATA: Readonly<IApiSubscriberFunctionTransactionContextData>;
}
