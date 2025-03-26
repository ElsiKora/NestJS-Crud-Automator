import type { IDtoStrategy } from "../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "../../../../type";

import { EApiRouteType } from "../../../../enum";

export class DtoStrategyBody implements IDtoStrategy {
	getDecoratorConfig(method: EApiRouteType, _metadata: TApiPropertyDescribeProperties): TApiPropertyDescribeDtoProperties {
		switch (method) {
			case EApiRouteType.CREATE: {
				return { isRequired: true };
			}

			case EApiRouteType.DELETE: {
				return { isRequired: false };
			}

			case EApiRouteType.GET: {
				return { isRequired: false };
			}

			case EApiRouteType.GET_LIST: {
				return { isRequired: false };
			}

			case EApiRouteType.PARTIAL_UPDATE: {
				return { isRequired: false };
			}

			case EApiRouteType.UPDATE: {
				return { isRequired: true };
			}

			default: {
				return { isRequired: false };
			}
		}
	}
}
