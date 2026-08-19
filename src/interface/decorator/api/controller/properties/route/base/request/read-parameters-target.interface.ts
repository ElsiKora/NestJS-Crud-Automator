import type { TApiControllerReadParameterTransformer } from "@type/decorator/api/controller";

import type { IApiControllerPropertiesRouteBaseRequestTarget } from "./target.interface";

export interface IApiControllerPropertiesRouteReadParametersRequestTarget<E> extends Omit<IApiControllerPropertiesRouteBaseRequestTarget<E>, "transformers"> {
	transformers?: Array<TApiControllerReadParameterTransformer<E>>;
}
