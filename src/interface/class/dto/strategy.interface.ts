import type { EApiRouteType } from "@enum/decorator/api";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";

export interface IDtoStrategy {
	getDecoratorConfig(method: EApiRouteType, metadata: TApiPropertyDescribeProperties): TApiPropertyDescribeDtoProperties;
}
