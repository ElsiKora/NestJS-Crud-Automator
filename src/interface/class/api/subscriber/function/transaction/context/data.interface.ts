import type { IApiFunctionTransaction } from "@interface/class/api/function/transaction/interface";
import type { TApiFunctionTransactionEvent } from "@type/class/api/function/transaction/event.type";

export interface IApiSubscriberFunctionTransactionContextData {
	events: ReadonlyArray<TApiFunctionTransactionEvent>;
	matchedEvents: ReadonlyArray<TApiFunctionTransactionEvent>;
	transaction: Readonly<IApiFunctionTransaction>;
}
