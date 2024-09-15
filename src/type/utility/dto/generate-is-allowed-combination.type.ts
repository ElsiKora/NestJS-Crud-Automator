import type { TDtoGenerateAllowedCombinations } from "./generate-allowed-combination.type";
import type { EApiDtoType, EApiRouteType } from "../../../enum";

export type TDtoGenerateIsAllowedCombination<M extends EApiRouteType, D extends EApiDtoType> = D extends TDtoGenerateAllowedCombinations[M] ? true : false;
