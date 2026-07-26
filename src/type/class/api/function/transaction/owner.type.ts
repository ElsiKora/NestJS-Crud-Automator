import type { IApiFunctionTransactionFunctionOwner, IApiFunctionTransactionRouteOwner, IApiFunctionTransactionScopeOwner } from "@interface/class/api/function/transaction/owner";

export type TApiFunctionTransactionOwner = Readonly<IApiFunctionTransactionFunctionOwner> | Readonly<IApiFunctionTransactionRouteOwner> | Readonly<IApiFunctionTransactionScopeOwner>;
