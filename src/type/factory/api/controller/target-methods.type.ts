import type { ApiServiceBase } from "@class/api";
import type { EApiRouteType } from "@enum/decorator/api";
import type { TApiControllerMethodMap, TApiControllerMethodName } from "@type/factory/api/controller/method";

// eslint-disable-next-line @elsikora/typescript/no-explicit-any
export type TApiControllerTargetMethod<E> = new (...arguments_: Array<any>) => {
	[K in EApiRouteType as TApiControllerMethodName<K>]: TApiControllerMethodMap<E>[K];
} & {
	service: ApiServiceBase<E>;
};
