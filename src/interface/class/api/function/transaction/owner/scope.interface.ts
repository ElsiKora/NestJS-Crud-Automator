import type { EApiFunctionTransactionOwnerKind } from "@enum/decorator/api";

export interface IApiFunctionTransactionScopeOwner {
	kind: EApiFunctionTransactionOwnerKind.SCOPE;
	name: string;
}
