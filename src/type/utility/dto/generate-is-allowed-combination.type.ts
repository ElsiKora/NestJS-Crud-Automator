import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { TDtoGenerateAllowedCombinations } from "@type/utility/dto/generate-allowed-combination.type";

export type TDtoGenerateIsAllowedCombination<M extends EApiRouteType, D extends EApiDtoType> = D extends TDtoGenerateAllowedCombinations[M] ? true : false;
