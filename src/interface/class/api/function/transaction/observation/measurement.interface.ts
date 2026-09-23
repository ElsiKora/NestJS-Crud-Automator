import type { EApiFunctionTransactionEventStatus } from "@enum/decorator/api";

export interface IApiFunctionTransactionObservationMeasurement {
	durationMs: number;
	selectorIndex: number;
	status: EApiFunctionTransactionEventStatus;
}
