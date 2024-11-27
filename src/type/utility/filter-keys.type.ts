import type { EFilterOperation } from "../../enum/filter-operation.enum";

export type TFilterKeys<T> = {
	[K in keyof T]: {
		operator: EFilterOperation;
		value: T[K];
	};
};
