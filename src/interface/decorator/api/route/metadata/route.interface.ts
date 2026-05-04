import type { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { RequestMethod } from "@nestjs/common";

export interface IApiRouteRouteMetadata {
	method: RequestMethod;
	path: string;
	type?: EApiRouteType;
}
