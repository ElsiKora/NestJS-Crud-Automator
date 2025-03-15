import type { EApiDtoType, EApiRouteType } from "../../enum";
import type { IDtoStrategy } from "../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties, TDtoGenerateIsAllowedCombination } from "../../type";

import { DTO_UTILITY_CONSTANT } from "../../constant/utility/dto/constant";

import { DtoValidatePropertyConfig } from "./validate-property-config.utility";

// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
export const DtoGetDecoratorConfig = <M extends EApiRouteType, D extends EApiDtoType>(method: M, metadata: TApiPropertyDescribeProperties, dtoType: D, propertyName: string): TApiPropertyDescribeDtoProperties => {
	const strategy: Record<EApiDtoType, IDtoStrategy>[D] = DTO_UTILITY_CONSTANT.DTO_STRATEGIES[dtoType];

	if (!strategy) {
		throw new Error(`Unknown DTO type ${dtoType}`);
	}

	let config: TApiPropertyDescribeDtoProperties = strategy.getDecoratorConfig(method, metadata);

	type TAllowed = TDtoGenerateIsAllowedCombination<M, D>;
	type TPropertiesType = TAllowed extends true ? TApiPropertyDescribeDtoProperties : never;

	const properties: Record<D, TPropertiesType> | undefined = metadata.properties?.[method] as Record<D, TPropertiesType> | undefined;

	if (properties && properties[dtoType]) {
		const customConfig: Record<D, TPropertiesType>[D] = properties[dtoType];
		DtoValidatePropertyConfig(customConfig, propertyName);

		config = { ...config, ...customConfig };
	}

	return config;
};
