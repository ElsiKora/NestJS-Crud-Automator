import type { TApiControllerPathParameterTransformer } from "@type/decorator/api/controller";

import type { IApiControllerPropertiesRouteBaseRequestTarget } from "./target.interface";

export interface IApiControllerPropertiesRoutePathParametersRequestTarget<E> extends Omit<IApiControllerPropertiesRouteBaseRequestTarget<E>, "transformers"> {
	transformers?: Array<TApiControllerPathParameterTransformer<E>>;
}
