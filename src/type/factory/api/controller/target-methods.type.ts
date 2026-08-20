import type { ApiServiceBase } from "@class/api";
import type { EApiControllerGetListQueryPaginationMode, EApiRouteType } from "@enum/decorator/api";
import type { TApiControllerMethodMap, TApiControllerMethodName } from "@type/factory/api/controller/method";

// eslint-disable-next-line @elsikora/typescript/no-explicit-any
export type TApiControllerTargetMethod<E, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> = new (...arguments_: Array<any>) => {
	[K in EApiRouteType as TApiControllerMethodName<K>]: TApiControllerMethodMap<E, M>[K];
} & {
	service: ApiServiceBase<E>;
};
