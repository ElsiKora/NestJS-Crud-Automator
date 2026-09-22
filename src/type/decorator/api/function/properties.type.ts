import type { EApiFunctionTransactionMode, EApiFunctionType, EApiFunctionUpdatePersistenceMode } from "@enum/decorator/api";

export type TApiFunctionProperties<E> = {
	action?: string;
	entity: new () => E;
	transaction?: {
		mode: EApiFunctionTransactionMode;
	};
} & (
	| {
			persistenceMode?: EApiFunctionUpdatePersistenceMode;
			type: EApiFunctionType.UPDATE;
	  }
	| {
			persistenceMode?: never;
			type: Exclude<EApiFunctionType, EApiFunctionType.UPDATE>;
	  }
);
