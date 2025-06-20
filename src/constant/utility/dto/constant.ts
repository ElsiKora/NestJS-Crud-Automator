import type { IDtoStrategy } from "@interface/class";
import type { IDtoGenerateFactory } from "@interface/dto-generate-factory.interface";

import { DtoPropertyFactoryBoolean } from "@class/utility/dto/property/factory/boolean.class";
import { DtoPropertyFactoryDate } from "@class/utility/dto/property/factory/date.class";
import { DtoPropertyFactoryEnum } from "@class/utility/dto/property/factory/enum.class";
import { DtoPropertyFactoryNumber } from "@class/utility/dto/property/factory/number.class";
import { DtoPropertyFactoryObject } from "@class/utility/dto/property/factory/object.class";
import { DtoPropertyFactoryRelation } from "@class/utility/dto/property/factory/relation.class";
import { DtoPropertyFactoryString } from "@class/utility/dto/property/factory/string.class";
import { DtoPropertyFactoryUuid } from "@class/utility/dto/property/factory/uuid.class";
import { DtoStrategyBody, DtoStrategyQuery, DtoStrategyRequest, DtoStrategyResponse } from "@class/utility/dto/strategy";
import { EApiDtoType, EApiPropertyDescribeType } from "@enum/decorator/api";

const DTO_STRATEGIES: Record<EApiDtoType, IDtoStrategy> = {
	[EApiDtoType.BODY]: new DtoStrategyBody(),
	[EApiDtoType.QUERY]: new DtoStrategyQuery(),
	[EApiDtoType.REQUEST]: new DtoStrategyRequest(),
	[EApiDtoType.RESPONSE]: new DtoStrategyResponse(),
};

const PROPERTY_DECORATOR_FACTORIES: Record<EApiPropertyDescribeType, IDtoGenerateFactory<unknown>> = {
	[EApiPropertyDescribeType.BOOLEAN]: new DtoPropertyFactoryBoolean(),
	[EApiPropertyDescribeType.DATE]: new DtoPropertyFactoryDate(),
	[EApiPropertyDescribeType.ENUM]: new DtoPropertyFactoryEnum(),
	[EApiPropertyDescribeType.NUMBER]: new DtoPropertyFactoryNumber(),
	[EApiPropertyDescribeType.OBJECT]: new DtoPropertyFactoryObject(),
	[EApiPropertyDescribeType.RELATION]: new DtoPropertyFactoryRelation(),
	[EApiPropertyDescribeType.STRING]: new DtoPropertyFactoryString(),
	[EApiPropertyDescribeType.UUID]: new DtoPropertyFactoryUuid(),
};

export const DTO_UTILITY_CONSTANT: {
	readonly DTO_STRATEGIES: Record<EApiDtoType, IDtoStrategy>;
	readonly PROPERTY_DECORATOR_FACTORIES: Record<EApiPropertyDescribeType, IDtoGenerateFactory<unknown>>;
} = {
	DTO_STRATEGIES,
	PROPERTY_DECORATOR_FACTORIES,
} as const;
