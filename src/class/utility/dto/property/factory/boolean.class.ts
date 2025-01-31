import type { EApiDtoType, EApiRouteType } from "../../../../../enum";
import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeBooleanProperties, TApiPropertyDescribeDtoProperties } from "../../../../../type";

import { ApiPropertyBoolean } from "../../../../../decorator/api/property/boolean.decorator";

export class DtoPropertyFactoryBoolean<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeBooleanProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, _method: EApiRouteType, _dtoType: EApiDtoType, _propertyName: string): PropertyDecorator {
		const { type, ...restProperties }: TApiPropertyDescribeBooleanProperties = metadata;

		return ApiPropertyBoolean({
			entity,
			...config,
			...restProperties,
		});
	}
}
