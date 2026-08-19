import type { EApiDtoType } from "@enum/decorator/api";

export type TApiControllerPropertiesRouteWithoutParametersDto<D> = D extends object ? { [EApiDtoType.PARAMETERS]?: never } & Omit<D, EApiDtoType.PARAMETERS> : D;
