import type { EApiControllerGetListQueryUnlistedFields } from "@enum/decorator/api";
import type { TApiControllerGetListQueryOrderFields } from "@type/decorator/api/controller";

import type { IApiControllerPropertiesRouteGetListQueryOrderEntry } from "./entry.interface";

export interface IApiControllerPropertiesRouteGetListQueryOrder<E> {
	defaultOrder?: ReadonlyArray<IApiControllerPropertiesRouteGetListQueryOrderEntry<E>>;
	fields: TApiControllerGetListQueryOrderFields<E>;
	tieBreakers?: ReadonlyArray<IApiControllerPropertiesRouteGetListQueryOrderEntry<E>>;
	unlistedFields: EApiControllerGetListQueryUnlistedFields;
}
