import type { IDtoStrategy } from "@interface/class";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiRouteType } from "@enum/decorator/api";

export class DtoStrategyResponse implements IDtoStrategy {
	getDecoratorConfig(method: EApiRouteType, _metadata: TApiPropertyDescribeProperties): TApiPropertyDescribeDtoProperties {
		switch (method) {
			case EApiRouteType.CREATE: {
				return { isRequired: true, isResponse: true };
			}

			case EApiRouteType.DELETE: {
				return { isRequired: true, isResponse: true };
			}

			case EApiRouteType.GET: {
				return { isRequired: true, isResponse: true };
			}

			case EApiRouteType.GET_LIST: {
				return { isExpose: true, isRequired: true, isResponse: true };
			}

			case EApiRouteType.PARTIAL_UPDATE: {
				return { isRequired: true, isResponse: true };
			}

			case EApiRouteType.UPDATE: {
				return { isRequired: true, isResponse: true };
			}

			default: {
				return { isRequired: true, isResponse: true };
			}
		}
	}
}
