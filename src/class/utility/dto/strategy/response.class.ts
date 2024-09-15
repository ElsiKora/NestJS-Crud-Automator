import { EApiRouteType } from "../../../../enum";

import type { IDtoStrategy } from "../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "../../../../type";

export class DtoStrategyResponse implements IDtoStrategy {
	getDecoratorConfig(method: EApiRouteType, _metadata: TApiPropertyDescribeProperties): TApiPropertyDescribeDtoProperties {
		switch (method) {
			case EApiRouteType.DELETE: {
				return { expose: true, required: false, response: true };
			}

			default: {
				return { expose: true, required: false, response: true };
			}
		}
	}
}
