import type { IDtoStrategy } from "../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "../../../../type";

import { EApiRouteType } from "../../../../enum";

export class DtoStrategyResponse implements IDtoStrategy {
	getDecoratorConfig(method: EApiRouteType, _metadata: TApiPropertyDescribeProperties): TApiPropertyDescribeDtoProperties {
		switch (method) {
			case EApiRouteType.CREATE: {
				return { isResponse: true };
			}

			case EApiRouteType.DELETE: {
				return { isResponse: true };
			}

			case EApiRouteType.GET: {
				return { isResponse: true };
			}

			case EApiRouteType.GET_LIST: {
				return { isResponse: true, isExpose: true };
			}

			case EApiRouteType.PARTIAL_UPDATE: {
				return { isResponse: true };
			}

			case EApiRouteType.UPDATE: {
				return { isResponse: true };
			}

			default: {
				return { isResponse: true };
			}
		}
	}
}
