import type { IApiControllerPropertiesRouteReadScope } from "./scope.interface";

export interface IApiControllerPropertiesRouteBaseRead<E> {
	scope: IApiControllerPropertiesRouteReadScope<E>;
}
