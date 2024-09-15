import { EApiRouteType } from "../../../../enum";

import type { IDtoStrategy } from "../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "../../../../type";

export class DtoStrategyBody implements IDtoStrategy {
	getDecoratorConfig(method: EApiRouteType, _metadata: TApiPropertyDescribeProperties): TApiPropertyDescribeDtoProperties {
		switch (method) {
			case EApiRouteType.UPDATE: {
				return { expose: false, required: true, response: false };
			}

			case EApiRouteType.PARTIAL_UPDATE: {
				return { expose: false, required: false, response: false };
			}

			default: {
				return { expose: false, required: false, response: false };
			}
		}
	}
}
