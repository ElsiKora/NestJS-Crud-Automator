import { DTO_UTILITY_CONSTANT } from "../../constant/utility/dto/constant";

import { ErrorException } from "../error-exception.utility";

import type { IApiEntity, IDtoGenerateFactory } from "../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "../../type";

export const DtoGenerateDecorator = (metadata: TApiPropertyDescribeProperties, entity: IApiEntity, config: TApiPropertyDescribeDtoProperties): PropertyDecorator => {
	const factory: IDtoGenerateFactory = DTO_UTILITY_CONSTANT.PROPERTY_DECORATOR_FACTORIES[metadata.type];

	if (!factory) {
		throw ErrorException(`Unknown property type ${metadata.type}`);
	}

	return factory.create(metadata, entity, config);
};
