import type { EApiDtoType, EApiRouteType } from "../../../../../enum";
import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeEnumProperties } from "../../../../../type";

import { ApiPropertyEnum } from "../../../../../decorator/api/property/enum.decorator";

export class DtoPropertyFactoryEnum<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeEnumProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, _method: EApiRouteType, _dtoType: EApiDtoType, _propertyName: string): PropertyDecorator {
		const { type, ...restProperties }: TApiPropertyDescribeEnumProperties = metadata;

		return ApiPropertyEnum({
			entity,
			...config,
			...restProperties,
		});
	}
}
