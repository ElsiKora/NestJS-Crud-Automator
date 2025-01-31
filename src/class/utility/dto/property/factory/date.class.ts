import type { EApiDtoType, EApiRouteType } from "../../../../../enum";
import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeDateProperties, TApiPropertyDescribeDtoProperties } from "../../../../../type";

import { ApiPropertyDate } from "../../../../../decorator/api/property/date.decorator";

export class DtoPropertyFactoryDate<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeDateProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties, _method: EApiRouteType, _dtoType: EApiDtoType, _propertyName: string): PropertyDecorator {
		const { type, ...restProperties }: TApiPropertyDescribeDateProperties = metadata;

		return ApiPropertyDate({
			entity,
			...config,
			...restProperties,
		});
	}
}
