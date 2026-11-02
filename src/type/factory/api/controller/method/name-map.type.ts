import type { EApiRouteType } from "@enum/decorator/api";
import type { TApiControllerMethodName } from "@type/factory/api/controller/method/name.type";

export type TApiControllerMethodNameMap = {
	[K in EApiRouteType]: TApiControllerMethodName<K>;
};
