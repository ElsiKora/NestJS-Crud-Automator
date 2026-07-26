import type { EApiFunctionTransactionFailureStage } from "@enum/decorator/api";

export interface IApiFunctionTransactionFailure {
	error: unknown;
	stage: EApiFunctionTransactionFailureStage;
	subscriberName?: string;
}
