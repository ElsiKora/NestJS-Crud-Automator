import type { IApiFunctionTransactionFailedEvent, IApiFunctionTransactionSucceededEvent } from "@interface/class/api/function";

export type TApiFunctionTransactionEvent = Readonly<IApiFunctionTransactionFailedEvent> | Readonly<IApiFunctionTransactionSucceededEvent>;
