import type { IApiControllerPropertiesRouteReadScopeParameter } from "./scope-parameter.interface";

export interface IApiControllerPropertiesRouteReadScope<E> {
	parameters: ReadonlyArray<IApiControllerPropertiesRouteReadScopeParameter<E>>;
}
