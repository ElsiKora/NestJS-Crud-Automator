import type { IDtoStrategy } from "@interface/class";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiRouteType } from "@enum/decorator/api";

export class DtoStrategyRequest implements IDtoStrategy {
	getDecoratorConfig(method: EApiRouteType, _metadata: TApiPropertyDescribeProperties): TApiPropertyDescribeDtoProperties {
		// eslint-disable-next-line @elsikora/sonar/no-all-duplicated-branches
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
