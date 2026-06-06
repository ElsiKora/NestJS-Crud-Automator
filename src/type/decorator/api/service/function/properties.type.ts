import type { EApiFunctionTransactionMode } from "@enum/decorator/api";

export type TApiServiceFunctionProperties = {
	transaction: {
		mode: EApiFunctionTransactionMode;
	};
};
