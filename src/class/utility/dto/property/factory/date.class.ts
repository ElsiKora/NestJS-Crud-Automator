import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IDtoGenerateFactory } from "@interface/dto-generate-factory.interface";
import type { IApiEntity } from "@interface/entity";
import type { TApiPropertyDescribeDateProperties, TApiPropertyDescribeDtoProperties } from "@type/decorator/api/property";

import { ApiPropertyDate } from "@decorator/api/property/date.decorator";

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
