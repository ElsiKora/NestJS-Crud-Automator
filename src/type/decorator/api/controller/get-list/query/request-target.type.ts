import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteGetListQueryPagination, IApiControllerPropertiesRouteGetListQueryRequestTarget } from "@interface/decorator/api";

export type TApiControllerGetListQueryRequestTarget<E> =
	| ({
			pagination: IApiControllerPropertiesRouteGetListQueryPagination<EApiControllerGetListQueryPaginationMode.CURSOR>;
	  } & Omit<IApiControllerPropertiesRouteGetListQueryRequestTarget<E, EApiControllerGetListQueryPaginationMode.CURSOR>, "pagination">)
	| ({
			pagination?: IApiControllerPropertiesRouteGetListQueryPagination;
	  } & Omit<IApiControllerPropertiesRouteGetListQueryRequestTarget<E>, "pagination">);
