import type { EApiControllerGetListQueryUnlistedFields } from "@enum/decorator/api";
import type { TApiControllerGetListQueryFilterFields } from "@type/decorator/api/controller";

import type { IApiControllerPropertiesRouteGetListQueryFilterLink } from "./link.interface";

export interface IApiControllerPropertiesRouteGetListQueryFilter<E> {
	fields: TApiControllerGetListQueryFilterFields<E>;
	/** Link entities by the name their query names start with; a link exists only if declared here, whatever `unlistedFields` says. */
	links?: Readonly<Record<string, IApiControllerPropertiesRouteGetListQueryFilterLink>>;
	unlistedFields: EApiControllerGetListQueryUnlistedFields;
}
