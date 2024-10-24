import { DtoStrategyBody, DtoStrategyQuery, DtoStrategyRequest, DtoStrategyResponse } from "../../../class";
import { DtoPropertyFactoryBoolean, DtoPropertyFactoryDate, DtoPropertyFactoryNumber, DtoPropertyFactoryObject, DtoPropertyFactoryString, DtoPropertyFactoryUuid } from "../../../class/utility/dto";

import { DtoPropertyFactoryRelation } from "../../../class/utility/dto/property/factory/relation.class";
import { EApiDtoType, EApiPropertyDescribeType } from "../../../enum";

import type { IDtoGenerateFactory, IDtoStrategy } from "../../../interface";

const DTO_STRATEGIES: Record<EApiDtoType, IDtoStrategy> = {
	[EApiDtoType.BODY]: new DtoStrategyBody(),
	[EApiDtoType.QUERY]: new DtoStrategyQuery(),
	[EApiDtoType.REQUEST]: new DtoStrategyRequest(),
	[EApiDtoType.RESPONSE]: new DtoStrategyResponse(),
};

const PROPERTY_DECORATOR_FACTORIES: Record<EApiPropertyDescribeType, IDtoGenerateFactory<any>> = {
	[EApiPropertyDescribeType.BOOLEAN]: new DtoPropertyFactoryBoolean(),
	[EApiPropertyDescribeType.DATE]: new DtoPropertyFactoryDate(),
	[EApiPropertyDescribeType.NUMBER]: new DtoPropertyFactoryNumber(),
	[EApiPropertyDescribeType.OBJECT]: new DtoPropertyFactoryObject(),
	[EApiPropertyDescribeType.RELATION]: new DtoPropertyFactoryRelation(),
	[EApiPropertyDescribeType.STRING]: new DtoPropertyFactoryString(),
	[EApiPropertyDescribeType.UUID]: new DtoPropertyFactoryUuid(),
};

export const DTO_UTILITY_CONSTANT: {
	readonly DTO_STRATEGIES: Record<EApiDtoType, IDtoStrategy>;
	readonly PROPERTY_DECORATOR_FACTORIES: Record<EApiPropertyDescribeType, IDtoGenerateFactory<any>>;
} = {
	DTO_STRATEGIES,
	PROPERTY_DECORATOR_FACTORIES,
} as const;
