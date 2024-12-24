import type { EApiDtoType, EApiRouteType } from "../../../enum";

import type { TDtoGenerateAllowedCombinations } from "./generate-allowed-combination.type";

export type TDtoGenerateIsAllowedCombination<M extends EApiRouteType, D extends EApiDtoType> = D extends TDtoGenerateAllowedCombinations[M] ? true : false;
