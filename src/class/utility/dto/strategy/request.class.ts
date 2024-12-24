import type { IDtoStrategy } from "../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "../../../../type";

import { EApiRouteType } from "../../../../enum";

export class DtoStrategyRequest implements IDtoStrategy {
	getDecoratorConfig(method: EApiRouteType, _metadata: TApiPropertyDescribeProperties): TApiPropertyDescribeDtoProperties {
		switch (method) {
			case EApiRouteType.CREATE: {
				return { isRequired: true };
			}

			case EApiRouteType.DELETE: {
				return { isRequired: true };
			}

			case EApiRouteType.GET: {
				return { isRequired: true };
			}

			case EApiRouteType.GET_LIST: {
				return { isRequired: true };
			}

			case EApiRouteType.PARTIAL_UPDATE: {
				return { isRequired: true };
			}

			case EApiRouteType.UPDATE: {
				return { isRequired: true };
			}

			default: {
				return { isRequired: true };
			}
		}
	}
}
