import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import type { IApiRouteDocumentationProperties } from "../documentation-properties.interface";
import type { IApiRouteResponseProperties } from "../response";
import type { IApiRouteSecurityProperties } from "../security";
import type { IApiRouteThrottlingProperties } from "../throttling";

import type { IApiRouteResourceMetadata } from "./resource.interface";
import type { IApiRouteRouteMetadata } from "./route.interface";

export interface IApiRouteMetadata<E extends IApiBaseEntity> {
	documentation?: IApiRouteDocumentationProperties;
	resource: IApiRouteResourceMetadata<E>;
	response?: IApiRouteResponseProperties;
	route: IApiRouteRouteMetadata;
	security?: IApiRouteSecurityProperties;
	throttling?: IApiRouteThrottlingProperties;
}
