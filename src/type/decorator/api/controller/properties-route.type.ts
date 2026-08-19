import type { EApiRouteType } from "@enum/decorator/api";

import type { TApiControllerPropertiesRouteContract } from "./properties/route/contract.type";
import type { TApiControllerPropertiesRouteWithIdentity, TApiControllerPropertiesRouteWithoutIdentity } from "./properties/route/identity";

export type TApiControllerPropertiesRoute<E, R extends EApiRouteType> = (R extends EApiRouteType.GET ? TApiControllerPropertiesRouteWithIdentity<E, TApiControllerPropertiesRouteContract<E, R>> : never) | TApiControllerPropertiesRouteWithoutIdentity<TApiControllerPropertiesRouteContract<E, R>>;
