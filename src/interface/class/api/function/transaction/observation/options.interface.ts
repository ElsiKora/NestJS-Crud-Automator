import type { IApiFunctionTransactionObservationSelector } from "./selector.interface";
import type { IApiFunctionTransactionObservationSnapshot } from "./snapshot.interface";

export interface IApiFunctionTransactionObservationOptions {
	onSettled: (snapshot: Readonly<IApiFunctionTransactionObservationSnapshot>) => void;
	selectors: ReadonlyArray<Readonly<IApiFunctionTransactionObservationSelector>>;
}
