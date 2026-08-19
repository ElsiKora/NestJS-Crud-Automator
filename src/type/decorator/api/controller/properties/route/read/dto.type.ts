import type { TApiControllerPropertiesRouteWithoutParametersDto } from "../without-parameters-dto.type";

export type TApiControllerPropertiesRouteWithReadDto<T> = T extends { dto: infer D } ? { dto: TApiControllerPropertiesRouteWithoutParametersDto<D> } : T extends { dto?: infer D } ? { dto?: TApiControllerPropertiesRouteWithoutParametersDto<D> } : object;
