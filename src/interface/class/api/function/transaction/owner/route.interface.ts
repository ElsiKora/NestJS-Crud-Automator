import type { EApiFunctionTransactionOwnerKind, EApiRouteType } from "@enum/decorator/api";

export interface IApiFunctionTransactionRouteOwner {
	entityName: string;
	kind: EApiFunctionTransactionOwnerKind.ROUTE;
	methodName: string;
	routeType: EApiRouteType;
}
