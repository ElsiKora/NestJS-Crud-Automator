import type { EApiRouteType } from "src/enum";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "src/type";

export interface IDtoStrategy {
	getDecoratorConfig(method: EApiRouteType, metadata: TApiPropertyDescribeProperties): TApiPropertyDescribeDtoProperties;
}
