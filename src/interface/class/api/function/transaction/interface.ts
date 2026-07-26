import type { TApiFunctionTransactionOwner } from "@type/class/api/function/transaction/owner.type";

export interface IApiFunctionTransaction {
	id: string;
	owner: TApiFunctionTransactionOwner;
}
