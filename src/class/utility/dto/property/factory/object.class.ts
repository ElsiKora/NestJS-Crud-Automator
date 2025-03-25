import type { Type } from "@nestjs/common";

import type { EApiDtoType, EApiRouteType } from "../../../../../enum";
import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeObjectProperties, TApiPropertyObjectProperties } from "../../../../../type";

import { ApiPropertyObject } from "../../../../../decorator/api/property/object.decorator";

export class DtoPropertyFactoryObject<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeObjectProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, _method: EApiRouteType, _dtoType: EApiDtoType, _propertyName: string, generatedDTOs?: Record<string, Type<unknown>>): PropertyDecorator {
		const { dataType, type, ...restProperties }: TApiPropertyDescribeObjectProperties = metadata;

		return ApiPropertyObject({
			entity,
			generatedDTOs,
			type: dataType,
			...config,
			...restProperties,
		} as TApiPropertyObjectProperties);
	}
}
