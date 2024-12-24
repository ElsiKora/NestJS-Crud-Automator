import type { ApiServiceBase } from "../../../../class";
import type { EApiRouteType } from "../../../../enum";

import type { TApiControllerMethodMap } from "./method-map.type";
import type { TApiControllerMethodName } from "./method-name.type";

export type TApiControllerTargetMethod<E> = new (...arguments_: Array<any>) => {
	[K in EApiRouteType as TApiControllerMethodName<K>]: TApiControllerMethodMap<E>[K];
} & {
	service: ApiServiceBase<E>;
};
