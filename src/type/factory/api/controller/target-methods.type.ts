import type { TApiControllerMethodMap } from "./method-map.type";
import {TApiControllerMethodName} from "./method-name.type";

import type { BaseApiService } from "../../../../class";
import type { EApiRouteType } from "../../../../enum";

export type TApiControllerTargetMethod<E> = new (...arguments_: Array<any>) => {
	[K in EApiRouteType as TApiControllerMethodName<K>]: TApiControllerMethodMap<E>[K];
} & {
	service: BaseApiService<E>;
};
