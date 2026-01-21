import type { EFilterOperation } from "@enum/filter";

export type TFilterKeys<T> = {
	[K in keyof T]: {
		operator: EFilterOperation;
		value: T[K];
	};
};
