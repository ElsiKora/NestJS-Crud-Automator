import type { IApiControllerPropertiesRouteBaseRelationsReference } from "@interface/decorator/api/controller/properties/route/base/relations/reference.interface";
import type { IApiControllerPropertiesRouteBaseRelationsRequestLoad } from "@interface/decorator/api/controller/properties/route/base/relations/request/load.interface";

export interface IApiControllerPropertiesRouteBaseRelationsRequest<E> {
	load?: IApiControllerPropertiesRouteBaseRelationsRequestLoad<E>;
	reference: IApiControllerPropertiesRouteBaseRelationsReference;
}
