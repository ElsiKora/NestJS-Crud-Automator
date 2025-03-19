import type { EApiRouteType } from "../../../enum";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "../../../type";

export interface IDtoStrategy {
	getDecoratorConfig(method: EApiRouteType, metadata: TApiPropertyDescribeProperties): TApiPropertyDescribeDtoProperties;
}
