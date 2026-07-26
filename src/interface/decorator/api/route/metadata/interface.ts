import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteDocumentationProperties } from "@interface/decorator/api/route/documentation-properties.interface";
import type { IApiRouteResourceMetadata } from "@interface/decorator/api/route/metadata/resource.interface";
import type { IApiRouteRouteMetadata } from "@interface/decorator/api/route/metadata/route.interface";
import type { IApiRouteResponseProperties } from "@interface/decorator/api/route/response";
import type { IApiRouteSecurityProperties } from "@interface/decorator/api/route/security";
import type { IApiRouteThrottlingProperties } from "@interface/decorator/api/route/throttling";

export interface IApiRouteMetadata<E extends IApiBaseEntity> {
	documentation?: IApiRouteDocumentationProperties;
	resource: IApiRouteResourceMetadata<E>;
	response?: IApiRouteResponseProperties;
	route: IApiRouteRouteMetadata;
	security?: IApiRouteSecurityProperties;
	throttling?: IApiRouteThrottlingProperties;
}
