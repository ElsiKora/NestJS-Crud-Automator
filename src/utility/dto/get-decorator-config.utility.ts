import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IDtoStrategy } from "@interface/class";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { TDtoGenerateIsAllowedCombination } from "@type/utility";

import { DTO_UTILITY_CONSTANT } from "@constant/utility/dto/constant";
import { DtoValidatePropertyConfig } from "@utility/dto/validate-property-config.utility";

/**
 * Retrieves the configuration for property decorators based on method, metadata, and DTO type.
 * Allows for custom overrides defined in the property metadata and merges them with
 * defaults from the appropriate strategy.
 * @param {M} method - The API route type (CREATE, DELETE, GET, etc.)
 * @param {TApiPropertyDescribeProperties} metadata - The property metadata
 * @param {D} dtoType - The type of DTO (REQUEST, RESPONSE, etc.)
 * @param {string} propertyName - The name of the property
 * @returns {TApiPropertyDescribeDtoProperties} The merged decorator configuration
 * @throws {Error} When no strategy is found for the DTO type
 * @template M - The API route type
 * @template D - The DTO type
 */
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
