import type { Type } from "@nestjs/common";

export interface IApiControllerPropertiesRouteGetListResponseDtoConfig {
	itemType: Type<unknown>;
	name?: string;
}
