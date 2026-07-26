import type { EApiControllerGetListQueryUnlistedFields } from "@enum/decorator/api";
import type { TApiControllerGetListQueryOrderFields } from "@type/decorator/api/controller";

export interface IApiControllerPropertiesRouteGetListQueryOrder<E> {
	fields: TApiControllerGetListQueryOrderFields<E>;
	unlistedFields: EApiControllerGetListQueryUnlistedFields;
}
