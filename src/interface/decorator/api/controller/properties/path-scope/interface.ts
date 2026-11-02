import type { IApiControllerPropertiesPathScopeParameter } from "./parameter.interface";

export interface IApiControllerPropertiesPathScope<E> {
	parameters: ReadonlyArray<IApiControllerPropertiesPathScopeParameter<E>>;
}
