import type { EApiFunctionTransactionMode, EApiFunctionType } from "@enum/decorator/api";

export type TApiFunctionProperties<E> = {
	action?: string;
	entity: new () => E;
	transaction?: {
		mode: EApiFunctionTransactionMode;
	};
	type: EApiFunctionType;
};
