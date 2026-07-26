import type { EApiControllerGetListQueryUnlistedFields } from "@enum/decorator/api";
import type { TApiControllerGetListQueryFilterFields } from "@type/decorator/api/controller";

export interface IApiControllerPropertiesRouteGetListQueryFilter<E> {
	fields: TApiControllerGetListQueryFilterFields<E>;
	unlistedFields: EApiControllerGetListQueryUnlistedFields;
}
