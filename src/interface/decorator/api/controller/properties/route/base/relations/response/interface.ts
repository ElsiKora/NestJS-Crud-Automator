import type { IApiControllerPropertiesRouteBaseRelationsReference } from "@interface/decorator/api/controller/properties/route/base/relations/reference.interface";
import type { IApiControllerPropertiesRouteBaseRelationsResponseLoad } from "@interface/decorator/api/controller/properties/route/base/relations/response/load.interface";

export interface IApiControllerPropertiesRouteBaseRelationsResponse<E> {
	load?: IApiControllerPropertiesRouteBaseRelationsResponseLoad<E>;
	reference: IApiControllerPropertiesRouteBaseRelationsReference;
}
