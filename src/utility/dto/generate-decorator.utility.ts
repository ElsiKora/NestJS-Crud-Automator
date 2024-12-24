import type { EApiDtoType, EApiRouteType } from "../../enum";
import type { IApiEntity, IDtoGenerateFactory } from "../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "../../type";

import { DTO_UTILITY_CONSTANT } from "../../constant/utility/dto/constant";
import { EApiPropertyDescribeType } from "../../enum";
import { ErrorException } from "../error-exception.utility";

export function DtoGenerateDecorator<E>(metadata: TApiPropertyDescribeProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, method: EApiRouteType, dtoType: EApiDtoType, propertyName: string): PropertyDecorator {
	const factory: IDtoGenerateFactory<E> = DTO_UTILITY_CONSTANT.PROPERTY_DECORATOR_FACTORIES[metadata.type] as IDtoGenerateFactory<E>;

	if (!factory) {
		throw ErrorException(`Unknown property type ${metadata.type}`);
	}

	return metadata.type === EApiPropertyDescribeType.RELATION ? factory.create(metadata, entity, config, method, dtoType, propertyName) : factory.create(metadata, entity, config);
}
