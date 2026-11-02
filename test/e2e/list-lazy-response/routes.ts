import { EApiRouteType } from "../../../src/index";

const disabledRoute = { generation: { isEnabled: false } } as const;

export const LIST_LAZY_RESPONSE_DISABLED_ROUTES = {
	[EApiRouteType.CREATE]: disabledRoute,
	[EApiRouteType.DELETE]: disabledRoute,
	[EApiRouteType.GET]: disabledRoute,
	[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
	[EApiRouteType.UPDATE]: disabledRoute,
} as const;
