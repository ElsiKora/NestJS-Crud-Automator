import type { ApiServiceBase } from "@class/api";
import type { EApiRouteType } from "@enum/decorator/api";
import type { TApiControllerMethodMap } from "@type/factory/api/controller/method-map.type";
import type { TApiControllerMethodName } from "@type/factory/api/controller/method-name.type";

export type TApiControllerTargetMethod<E> = new (...arguments_: Array<any>) => {
	[K in EApiRouteType as TApiControllerMethodName<K>]: TApiControllerMethodMap<E>[K];
} & {
	service: ApiServiceBase<E>;
};
