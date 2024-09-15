import { EApiRouteType } from "../../../../enum";

import type { IDtoStrategy } from "../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "../../../../type";

export class DtoStrategyQuery implements IDtoStrategy {
	getDecoratorConfig(method: EApiRouteType, _metadata: TApiPropertyDescribeProperties): TApiPropertyDescribeDtoProperties {
		switch (method) {
			case EApiRouteType.GET_LIST: {
				return { expose: false, required: false, response: false };
			}

			default: {
				return { expose: true, required: false, response: false };
			}
		}
	}
}
