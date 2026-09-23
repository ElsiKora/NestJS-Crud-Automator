import type { EApiFunctionTransactionOutcome } from "@enum/decorator/api";

import type { IApiFunctionTransactionObservationMeasurement } from "./measurement.interface";

export interface IApiFunctionTransactionObservationSnapshot {
	droppedCount: number;
	measurements: ReadonlyArray<Readonly<IApiFunctionTransactionObservationMeasurement>>;
	outcome: EApiFunctionTransactionOutcome;
}
